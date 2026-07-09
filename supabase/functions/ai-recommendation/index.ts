/**
 * Supabase Edge Function: ai-recommendation
 *
 * Personalised venue recommendations from a customer's booking/favorite
 * history, ranked via the same hybrid public.search_venues() RPC that
 * backs ai-search — semantic similarity (once embeddings are warmed) plus
 * keyword/rating signals, so results are useful even for venues that
 * haven't been embedded yet.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embedQuery, warmVenueEmbeddings, toVectorLiteral } from "../_shared/embeddings.ts";
import { toVenuePayload } from "../_shared/venues.ts";
import { OPENROUTER_BASE_URL, DEFAULT_CHAT_MODEL, openRouterHeaders } from "../_shared/openrouter.ts";

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
): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: openRouterHeaders(openRouterApiKey),
    body: JSON.stringify({
      model: Deno.env.get("OPENROUTER_RECOMMENDATION_MODEL") ?? DEFAULT_CHAT_MODEL,
      temperature: 0.3,
      // Generous budget — the default free model reasons before writing
      // content; too low a cap truncates it mid-thought.
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content:
            "You are a venue recommendation engine for a Philippine events marketplace. Given a user's past booked and favorited venues, write one sentence (used as a semantic search query) describing the kind of venue they'd likely want next — style, setting, price tier. Return only that sentence, no preamble.",
        },
        {
          role: "user",
          content: `Past venues: ${venueNames.join(", ") || "none yet"}. Return only the search query string.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter preference summary failed: ${errorText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim()
    ? content.trim()
    : "elegant event venue";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Use POST for recommendations.", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    // Optional — only used for semantic embeddings; degrades gracefully.
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sign in to see personalised recommendations.", 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return errorResponse("UNAUTHORIZED", "Sign in to see personalised recommendations.", 401);
    }

    // Service-role client for writes/RPCs that must bypass RLS (impression logging, embedding warm-up).
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
    const excludeVenueIds = [...new Set(history.map((row: any) => row.venue_id))];
    const venueNames = history
      .map((row: any) => row.venues?.name)
      .filter((name: unknown): name is string => typeof name === "string");

    let mode: "personalized" | "cold_start" = "cold_start";
    let preferenceQuery: string | null = null;
    let venueRows: any[] = [];

    if (venueNames.length === 0) {
      const { data, error } = await supabase.rpc("search_venues", {
        query_embedding: null,
        keyword: null,
        match_count: recommendationCount + excludeVenueIds.length,
        sort_by: "rating",
      });

      if (error) {
        console.error("[ai-recommendation] Cold-start search_venues failed:", error);
        return errorResponse("RECOMMENDATION_FAILED", "Could not load recommendations.", 500);
      }

      venueRows = data ?? [];
    } else {
      mode = "personalized";
      preferenceQuery = await buildPreferenceQuery(openRouterApiKey, venueNames);

      // Best-effort backfill so newer venues have embeddings to match against.
      let queryVector: number[] | null = null;
      if (openAiApiKey) {
        await warmVenueEmbeddings(
          supabase,
          openAiApiKey,
          Number(Deno.env.get("AI_SEARCH_EMBED_REFRESH_LIMIT") ?? 8),
        );
        queryVector = await embedQuery(openAiApiKey, preferenceQuery);
      }

      const { data, error } = await supabase.rpc("search_venues", {
        query_embedding: queryVector ? toVectorLiteral(queryVector) : null,
        keyword: preferenceQuery,
        match_count: recommendationCount + excludeVenueIds.length,
        sort_by: "relevance",
      });

      if (error) {
        console.error("[ai-recommendation] Personalized search_venues failed:", error);
        return errorResponse("RECOMMENDATION_FAILED", "Could not load recommendations.", 500);
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
      reason:
        mode === "cold_start"
          ? { cold_start: true }
          : { matched: ["preference_summary"], preferenceQuery, similarity: venue.similarity },
      shown_at: new Date().toISOString(),
    }));

    const { data: insertedEvents, error: insertError } = await supabase
      .from("ai_recommendation_events")
      .insert(impressionRows)
      .select("id, venue_id");

    if (insertError) {
      console.error("[ai-recommendation] Failed to log impressions:", insertError);
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
      error instanceof Error ? error.message : "Recommendations are temporarily unavailable.",
      500,
    );
  }
});
