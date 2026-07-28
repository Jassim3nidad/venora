/**
 * Supabase Edge Function: ai-venue-description
 *
 * Generates venue copy (full description, SEO meta, or a package
 * description) as a draft row in ai_generated_content. Only an org
 * member for the venue (or admin) may generate. Approval that promotes
 * a draft into venues.ai_generated_description happens separately via
 * a Next.js Server Action (features/venues/application/actions.ts),
 * not here — this function only ever writes status: 'draft'.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

const contentTypes = [
  "description",
  "seo_meta",
  "package_description",
] as const;
type ContentType = (typeof contentTypes)[number];

const tones = ["elegant", "casual", "luxury"] as const;
type Tone = (typeof tones)[number];

const maxLengthByType: Record<ContentType, number> = {
  description: 2000,
  seo_meta: 160,
  package_description: 600,
};

type GenerateInput = {
  venueId: string;
  contentType: ContentType;
  packageId: string | null;
  tone: Tone;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500) {
  return jsonResponse({ data: null, error: { code, message } }, status);
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseInput(body: any): GenerateInput | null {
  const venueId = body?.venueId ?? body?.venue_id;
  const contentType = body?.contentType ?? body?.content_type;
  const packageId = body?.packageId ?? body?.package_id ?? null;
  const tone = body?.tone ?? "elegant";

  if (typeof venueId !== "string" || !uuidPattern.test(venueId)) return null;
  if (!contentTypes.includes(contentType)) return null;
  if (contentType === "package_description") {
    if (typeof packageId !== "string" || !uuidPattern.test(packageId)) {
      return null;
    }
  }
  if (!tones.includes(tone)) return null;

  return { venueId, contentType, packageId, tone };
}

function containsPlaceholderTokens(text: string) {
  return /\[[a-z0-9 _-]{2,40}\]/i.test(text) || /\{\{.*?\}\}/.test(text);
}

function buildPrompt(
  contentType: ContentType,
  tone: Tone,
  venue: any,
  pkg: any | null,
) {
  const amenities = [
    venue.parking_available && "parking",
    venue.pet_friendly && "pet friendly",
    venue.wheelchair_accessible && "wheelchair accessible",
    venue.has_pool && "pool",
    venue.overnight_accommodation && "overnight accommodation",
    venue.air_conditioned && "air conditioned",
  ]
    .filter(Boolean)
    .join(", ");

  const facts = [
    `Name: ${venue.name}`,
    `Location: ${[venue.city, venue.province].filter(Boolean).join(", ")}`,
    `Capacity: ${venue.capacity_min ?? "?"}-${
      venue.capacity_max ?? "?"
    } guests`,
    `Setting: ${venue.indoor_outdoor}`,
    amenities ? `Amenities: ${amenities}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  if (contentType === "seo_meta") {
    return {
      system:
        "You are an SEO copywriter for a Philippine event-venue marketplace. Write a single meta description of 160 characters or fewer, no markdown, no quotation marks, that entices a search click. Never invent facts not given.",
      user: `Facts: ${facts}. Tone: ${tone}.`,
    };
  }

  if (contentType === "package_description" && pkg) {
    return {
      system:
        "You are a copywriter for a Philippine event-venue marketplace. Write one short paragraph (2-4 sentences) describing an event package. You must reference its actual inclusions list — never invent inclusions, prices, or guest limits not given.",
      user:
        `Venue: ${facts}. Package: ${pkg.name}, price PHP ${pkg.price}, guests ${
          pkg.min_guests ?? "?"
        }-${pkg.max_guests ?? "?"}, inclusions: ${
          (pkg.inclusions ?? []).join(", ") || "none listed"
        }. Tone: ${tone}.`,
    };
  }

  return {
    system:
      "You are a copywriter for a Philippine event-venue marketplace. Write a warm, specific, 2-3 paragraph venue description from the structured facts given. Never invent amenities, prices, or capacity numbers not present in the input. Avoid generic phrases like 'perfect for your special day' more than once. Match the requested tone.",
    user: `Facts: ${facts}. Tone: ${tone}.`,
  };
}

async function requestCopy(
  openRouterApiKey: string,
  prompt: { system: string; user: string },
  config: AiConfiguration,
): Promise<{
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  providerUsed: string;
  modelUsed: string;
  usedFallback: boolean;
}> {
  const { response, providerUsed, modelUsed, usedFallback } =
    await postChatCompletion(config, openRouterApiKey, {
      temperature: config.temperature ?? 0.6,
      // Generous budget — the approved model may reason before writing
      // content; too low a cap can truncate it mid-response.
      max_tokens: config.maxTokens,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI copy generation failed: ${errorText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI provider returned no copy content.");
  }

  return {
    text: content.trim(),
    ...extractTokenUsage(payload),
    providerUsed,
    modelUsed,
    usedFallback,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Use POST to generate venue copy.",
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
        "Missing Supabase configuration.",
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fail closed: an admin-disabled feature (or an unsupported
    // provider/model) never reaches the AI provider at all.
    const config = await loadAiConfig(supabase, "venue_description");
    if (!config) {
      return errorResponse(
        "AI_CONFIG_MISSING",
        "AI configuration for this feature is missing.",
        500,
      );
    }
    if (!config.enabled) {
      return errorResponse(
        "AI_FEATURE_DISABLED",
        "Venue copy generation is currently disabled.",
        403,
      );
    }
    const providerCheck = validateProviderModel(config);
    if (!providerCheck.ok) {
      return errorResponse(
        "AI_PROVIDER_UNSUPPORTED",
        providerCheck.reason!,
        500,
      );
    }

    if (!openRouterApiKey) {
      return errorResponse(
        "OPENROUTER_NOT_CONFIGURED",
        "OPENROUTER_API_KEY is not configured.",
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        "UNAUTHORIZED",
        "Sign in to generate venue copy.",
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
        "Sign in to generate venue copy.",
        401,
      );
    }

    const rawBody = await req.json().catch(() => null);
    const input = parseInput(rawBody);
    if (!input) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Provide a valid venueId, contentType, and tone (packageId is required for package_description).",
        400,
      );
    }

    const limitCheck = await checkAiUsageLimits(
      supabase,
      "venue_description",
      config,
    );
    if (!limitCheck.allowed) {
      return errorResponse("AI_LIMIT_EXCEEDED", limitCheck.reason!, 429);
    }

    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select(
        "id, name, city, province, capacity_min, capacity_max, indoor_outdoor, organization_id, parking_available, pet_friendly, wheelchair_accessible, has_pool, overnight_accommodation, air_conditioned",
      )
      .eq("id", input.venueId)
      .maybeSingle();

    if (venueError) {
      console.error("[ai-venue-description] Venue lookup failed:", venueError);
      return errorResponse(
        "VENUE_LOOKUP_FAILED",
        "Could not look up the venue.",
        500,
      );
    }
    if (!venue) {
      return errorResponse("VENUE_NOT_FOUND", "Venue not found.", 404);
    }

    // Self-enforced authorization — this function runs with the service-role
    // key (RLS bypassed), so it must check org membership / admin itself.
    const [{ data: membership }, { data: adminRole }] = await Promise.all([
      supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", venue.organization_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle(),
    ]);

    if (!membership && !adminRole) {
      return errorResponse(
        "FORBIDDEN",
        "You do not have access to generate copy for this venue.",
        403,
      );
    }

    let pkg: any = null;
    if (input.contentType === "package_description") {
      const { data: packageRow, error: packageError } = await supabase
        .from("venue_packages")
        .select("id, name, price, min_guests, max_guests, inclusions")
        .eq("id", input.packageId!)
        .eq("venue_id", input.venueId)
        .maybeSingle();

      if (packageError) {
        console.error(
          "[ai-venue-description] Package lookup failed:",
          packageError,
        );
        return errorResponse(
          "PACKAGE_LOOKUP_FAILED",
          "Could not look up the package.",
          500,
        );
      }
      if (!packageRow) {
        return errorResponse(
          "PACKAGE_NOT_FOUND",
          "Package not found for this venue.",
          404,
        );
      }
      pkg = packageRow;
    }

    const prompt = buildPrompt(input.contentType, input.tone, venue, pkg);

    const requestStartedAt = Date.now();
    let copyResult: Awaited<ReturnType<typeof requestCopy>>;
    try {
      copyResult = await requestCopy(openRouterApiKey, prompt, config);
    } catch (error) {
      await logAiUsage(supabase, {
        feature: "venue_description",
        provider: config.provider,
        model: config.model,
        actorId: user.id,
        durationMs: Date.now() - requestStartedAt,
        success: false,
        errorCategory: "provider_error",
      });
      throw error;
    }

    const {
      text: generatedText,
      inputTokens,
      outputTokens,
      providerUsed,
      modelUsed,
      usedFallback,
    } = copyResult;
    await logAiUsage(supabase, {
      feature: "venue_description",
      provider: providerUsed,
      model: modelUsed,
      actorId: user.id,
      inputTokens,
      outputTokens,
      estimatedCostCents: estimateCostCents(
        modelUsed,
        (inputTokens ?? 0) + (outputTokens ?? 0),
      ),
      durationMs: Date.now() - requestStartedAt,
      success: true,
      errorCategory: usedFallback ? "used_fallback_provider" : null,
    });

    const maxLength = maxLengthByType[input.contentType];

    if (generatedText.length > maxLength) {
      return errorResponse(
        "GENERATION_TOO_LONG",
        `Generated copy exceeded the ${maxLength}-character limit for ${input.contentType}. Please try again.`,
        502,
      );
    }
    if (containsPlaceholderTokens(generatedText)) {
      return errorResponse(
        "GENERATION_INVALID",
        "Generated copy contained placeholder text. Please try again.",
        502,
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("ai_generated_content")
      .insert({
        venue_id: input.venueId,
        content_type: input.contentType,
        prompt: JSON.stringify({
          ...prompt,
          tone: input.tone,
          packageId: input.packageId,
        }),
        generated_text: generatedText,
        status: "draft",
      })
      .select("id, venue_id, content_type, generated_text, status, created_at")
      .single();

    if (insertError || !inserted) {
      console.error(
        "[ai-venue-description] Failed to save draft:",
        insertError,
      );
      return errorResponse(
        "SAVE_FAILED",
        "Could not save the generated draft.",
        500,
      );
    }

    return jsonResponse({
      data: {
        content: {
          id: inserted.id,
          venueId: inserted.venue_id,
          contentType: inserted.content_type,
          generatedText: inserted.generated_text,
          status: inserted.status,
          createdAt: inserted.created_at,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("[ai-venue-description] Unexpected error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error
        ? error.message
        : "Copy generation is temporarily unavailable.",
      500,
    );
  }
});
