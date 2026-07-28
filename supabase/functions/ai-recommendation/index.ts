/**
 * Supabase Edge Function: ai-recommendation
 *
 * Personalised venue recommendations from a customer's booking/favorite
 * history, ranked via the same public.search_venues() RPC that backs
 * ai-search. OpenRouter turns history into a grounded keyword query; the
 * database remains the source of venue facts and ranking results.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toVenuePayload } from "../_shared/venues.ts";
import {
  type AiConfiguration,
  checkAiUsageLimits,
  estimateCostCents,
  extractTokenUsage,
  loadAiConfig,
  logAiUsage,
  postChatCompletion,
  validateProviderModel,
} from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const recommendationCount = 8;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500) {
  return jsonResponse({ data: null, error: { code, message } }, status);
}

async function buildPreferenceQuery(
  openRouterApiKey: string,
  venueNames: string[],
  config: AiConfiguration,
): Promise<{
  query: string;
  inputTokens: number | null;
  outputTokens: number | null;
  providerUsed: string;
  modelUsed: string;
}> {
  const { response, providerUsed, modelUsed } = await postChatCompletion(
    config,
    openRouterApiKey,
    {
      temperature: config.temperature ?? 0.3,
      // Generous budget — the approved model may reason before writing
      // content; too low a cap can truncate it mid-response.
      max_tokens: config.maxTokens,
      messages: [
        {
          role: "system",
          content:
            "You are a venue recommendation engine for a Philippine events marketplace. Given a user's past booked and favorited venues, write one sentence (used as a semantic search query) describing the kind of venue they'd likely want next — style, setting, price tier. Return only that sentence, no preamble.",
        },
        {
          role: "user",
          content: `Past venues: ${
            venueNames.join(", ") || "none yet"
          }. Return only the search query string.`,
        },
      ],
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI preference summary failed: ${errorText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const query = typeof content === "string" && content.trim()
    ? content.trim()
    : "elegant event venue";
  return { query, ...extractTokenUsage(payload), providerUsed, modelUsed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Use POST for recommendations.",
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return errorResponse(
        "CONFIGURATION_ERROR",
        "Recommendations are missing Supabase configuration.",
        500,
      );
    }

    if (!openRouterApiKey) {
      return errorResponse(
        "OPENROUTER_NOT_CONFIGURED",
        "OPENROUTER_API_KEY is not configured for ai-recommendation.",
        500,
      );
    }

    // Service-role client for writes/RPCs that must bypass RLS (impression
    // logging) — also used to load AI config before auth
    // resolves, since config gating doesn't depend on who's asking.
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const aiConfig = await loadAiConfig(supabase, "recommendation");
    const providerCheck = aiConfig
      ? validateProviderModel(aiConfig)
      : { ok: false as const };
    let aiLimitCheck: { allowed: boolean; reason?: string } = { allowed: true };
    if (aiConfig?.enabled && providerCheck.ok) {
      aiLimitCheck = await checkAiUsageLimits(
        supabase,
        "recommendation",
        aiConfig,
      );
    }
    // If the AI personalization feature is disabled/misconfigured/rate-limited,
    // this endpoint doesn't fail closed entirely — it falls back to the
    // existing cold-start (rating-based) path below, which needs no AI call
    // at all. That's a deliberate, narrower interpretation of "fail closed"
    // for this specific endpoint: the AI call is skipped, not the feature.
    const personalizationAllowed = !!aiConfig?.enabled && providerCheck.ok &&
      aiLimitCheck.allowed;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        "UNAUTHORIZED",
        "Sign in to see personalised recommendations.",
        401,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return errorResponse(
        "UNAUTHORIZED",
        "Sign in to see personalised recommendations.",
        401,
      );
    }

    const [bookingsRes, favsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("venue_id, venues(name)")
        .eq("customer_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("favorites")
        .select("venue_id, venues(name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const history = [...(bookingsRes.data ?? []), ...(favsRes.data ?? [])];
    const excludeVenueIds = [
      ...new Set(history.map((row: any) => row.venue_id)),
    ];
    const venueNames = history
      .map((row: any) => row.venues?.name)
      .filter((name: unknown): name is string => typeof name === "string");

    let mode: "personalized" | "cold_start" = "cold_start";
    let preferenceQuery: string | null = null;
    let venueRows: any[] = [];

    if (venueNames.length === 0 || !personalizationAllowed) {
      const { data, error } = await supabase.rpc("search_venues", {
        query_embedding: null,
        keyword: null,
        match_count: recommendationCount + excludeVenueIds.length,
        sort_by: "rating",
      });

      if (error) {
        console.error(
          "[ai-recommendation] Cold-start search_venues failed:",
          error,
        );
        return errorResponse(
          "RECOMMENDATION_FAILED",
          "Could not load recommendations.",
          500,
        );
      }

      venueRows = data ?? [];
    } else {
      mode = "personalized";
      const requestStartedAt = Date.now();
      let queryResult: Awaited<ReturnType<typeof buildPreferenceQuery>>;
      try {
        queryResult = await buildPreferenceQuery(
          openRouterApiKey,
          venueNames,
          aiConfig!,
        );
      } catch (error) {
        await logAiUsage(supabase, {
          feature: "recommendation",
          provider: aiConfig!.provider,
          model: aiConfig!.model,
          actorId: user.id,
          durationMs: Date.now() - requestStartedAt,
          success: false,
          errorCategory: "provider_error",
        });
        throw error;
      }
      preferenceQuery = queryResult.query;
      await logAiUsage(supabase, {
        feature: "recommendation",
        provider: queryResult.providerUsed,
        model: queryResult.modelUsed,
        actorId: user.id,
        inputTokens: queryResult.inputTokens,
        outputTokens: queryResult.outputTokens,
        estimatedCostCents: estimateCostCents(
          queryResult.modelUsed,
          (queryResult.inputTokens ?? 0) + (queryResult.outputTokens ?? 0),
        ),
        durationMs: Date.now() - requestStartedAt,
        success: true,
      });

      const { data, error } = await supabase.rpc("search_venues", {
        query_embedding: null,
        keyword: preferenceQuery,
        match_count: recommendationCount + excludeVenueIds.length,
        sort_by: "relevance",
      });

      if (error) {
        console.error(
          "[ai-recommendation] Personalized search_venues failed:",
          error,
        );
        return errorResponse(
          "RECOMMENDATION_FAILED",
          "Could not load recommendations.",
          500,
        );
      }

      venueRows = data ?? [];
    }

    const excludeSet = new Set(excludeVenueIds);
    const venues = venueRows
      .filter((row: any) => !excludeSet.has(row.id))
      .slice(0, recommendationCount)
      .map(toVenuePayload);

    if (venues.length === 0) {
      return jsonResponse({
        data: { venues: [], recommendationEventIds: {}, mode, preferenceQuery },
        error: null,
      });
    }

    const impressionRows = venues.map((venue) => ({
      user_id: user.id,
      venue_id: venue.id,
      reason: mode === "cold_start" ? { cold_start: true } : {
        matched: ["preference_summary"],
        preferenceQuery,
        similarity: venue.similarity,
      },
      shown_at: new Date().toISOString(),
    }));

    const { data: insertedEvents, error: insertError } = await supabase
      .from("ai_recommendation_events")
      .insert(impressionRows)
      .select("id, venue_id");

    if (insertError) {
      console.error(
        "[ai-recommendation] Failed to log impressions:",
        insertError,
      );
    }

    const recommendationEventIds: Record<string, string> = {};
    for (const event of insertedEvents ?? []) {
      recommendationEventIds[event.venue_id] = event.id;
    }

    return jsonResponse({
      data: { venues, recommendationEventIds, mode, preferenceQuery },
      error: null,
    });
  } catch (error) {
    console.error("[ai-recommendation] Unexpected error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error
        ? error.message
        : "Recommendations are temporarily unavailable.",
      500,
    );
  }
});
