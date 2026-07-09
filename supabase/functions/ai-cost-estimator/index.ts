/**
 * Supabase Edge Function: ai-cost-estimator
 *
 * Given event details (venue, guest count, duration, extras), produces an
 * itemized PHP cost breakdown using OpenAI structured output, validated
 * server-side before it's persisted or returned.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const openAiBaseUrl = "https://api.openai.com/v1";
const defaultModel = "gpt-4o-mini";

type EstimatorInput = {
  venueId: string;
  guestCount: number;
  eventType: string;
  durationHours: number;
  includesCatering: boolean;
  includesAv: boolean;
};

type CostEstimate = {
  baseVenue: number;
  packages: number;
  catering: number;
  av: number;
  total: number;
  breakdown: string[];
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

function parseInput(body: any): EstimatorInput | null {
  const venueId = body?.venueId ?? body?.venue_id;
  const guestCount = Number(body?.guestCount ?? body?.guest_count);
  const eventType = String(body?.eventType ?? body?.event_type ?? "").trim();
  const durationHours = Number(body?.durationHours ?? body?.duration_hours);
  const includesCatering = Boolean(
    body?.includesCatering ?? body?.includes_catering ?? false,
  );
  const includesAv = Boolean(body?.includesAV ?? body?.includes_av ?? false);

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof venueId !== "string" || !uuidPattern.test(venueId)) return null;
  if (!Number.isFinite(guestCount) || guestCount < 1) return null;
  if (!eventType || eventType.length > 60) return null;
  if (!Number.isFinite(durationHours) || durationHours <= 0) return null;

  return {
    venueId,
    guestCount: Math.round(guestCount),
    eventType,
    durationHours,
    includesCatering,
    includesAv,
  };
}

function isValidEstimate(value: any): value is CostEstimate {
  if (!value || typeof value !== "object") return false;
  const numericFields = ["baseVenue", "packages", "catering", "av", "total"];
  for (const field of numericFields) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
      return false;
    }
  }
  if (!Array.isArray(value.breakdown) || value.breakdown.length === 0) {
    return false;
  }
  if (!value.breakdown.every((line: unknown) => typeof line === "string")) {
    return false;
  }

  const sum = value.baseVenue + value.packages + value.catering + value.av;
  // Allow small rounding drift from the model (within 1 peso per component).
  return Math.abs(sum - value.total) <= 4;
}

async function requestEstimate(
  openAiApiKey: string,
  venueInfo: string,
  input: EstimatorInput,
): Promise<CostEstimate> {
  const response = await fetch(`${openAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_ESTIMATOR_MODEL") ?? defaultModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a venue event cost estimator for the Philippine events market. Given a venue's base price, its packages, and event parameters, produce a realistic itemized cost breakdown in PHP. Round all figures to the nearest 100. `total` must equal the sum of baseVenue + packages + catering + av. If catering or AV is not requested, their values must be 0. `breakdown` is 3 to 6 short line items explaining the total in plain English for a customer, not code.",
        },
        {
          role: "user",
          content: `Venue: ${venueInfo}. Event: ${input.eventType}, ${input.guestCount} guests, ${input.durationHours}h. Catering requested: ${input.includesCatering}. AV requested: ${input.includesAv}.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "venue_cost_estimate",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              baseVenue: { type: "number" },
              packages: { type: "number" },
              catering: { type: "number" },
              av: { type: "number" },
              total: { type: "number" },
              breakdown: { type: "array", items: { type: "string" } },
            },
            required: ["baseVenue", "packages", "catering", "av", "total", "breakdown"],
          },
        },
      },
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI cost estimate failed: ${errorText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI returned no estimate content.");
  }

  return JSON.parse(content);
}

async function getAuthenticatedUserId(req: Request, supabaseUrl: string) {
  const authorization = req.headers.get("Authorization");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authorization || !anonKey) return null;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await userClient.auth.getUser();
  return data.user?.id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Use POST for cost estimates.", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        "CONFIGURATION_ERROR",
        "Cost estimator is missing Supabase configuration.",
        500,
      );
    }

    if (!openAiApiKey) {
      return errorResponse(
        "OPENAI_NOT_CONFIGURED",
        "OPENAI_API_KEY is not configured for ai-cost-estimator.",
        500,
      );
    }

    const rawBody = await req.json().catch(() => null);
    const input = parseInput(rawBody);

    if (!input) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Provide a valid venueId, guestCount, eventType, and durationHours.",
        400,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id, name, base_price, venue_packages(name, price, inclusions)")
      .eq("id", input.venueId)
      .eq("status", "published")
      .maybeSingle();

    if (venueError) {
      console.error("[ai-cost-estimator] Venue lookup failed:", venueError);
      return errorResponse("VENUE_LOOKUP_FAILED", "Could not look up the venue.", 500);
    }

    if (!venue) {
      return errorResponse("VENUE_NOT_FOUND", "Venue not found or not published.", 404);
    }

    const venueInfo = JSON.stringify(venue);
    let estimate: CostEstimate | null = null;
    let lastError: unknown = null;

    // One retry if the model's arithmetic doesn't check out.
    for (let attempt = 0; attempt < 2 && !estimate; attempt++) {
      try {
        const candidate = await requestEstimate(openAiApiKey, venueInfo, input);
        if (isValidEstimate(candidate)) {
          estimate = candidate;
        } else {
          lastError = new Error("Estimate failed shape/arithmetic validation.");
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (!estimate) {
      console.error("[ai-cost-estimator] Failed to produce a valid estimate:", lastError);
      return errorResponse(
        "ESTIMATE_FAILED",
        "Could not generate a reliable cost estimate. Please try again.",
        502,
      );
    }

    const userId = await getAuthenticatedUserId(req, supabaseUrl);
    const { error: logError } = await supabase.from("ai_generated_content").insert({
      venue_id: input.venueId,
      content_type: "cost_estimate",
      prompt: JSON.stringify({ ...input, userId }),
      generated_text: JSON.stringify(estimate),
      status: "approved",
    });

    if (logError) {
      console.error("[ai-cost-estimator] Failed to log estimate:", logError);
    }

    return jsonResponse({
      data: {
        estimate,
        venue: {
          id: venue.id,
          name: venue.name,
          basePrice: venue.base_price === null ? null : Number(venue.base_price),
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("[ai-cost-estimator] Unexpected error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Cost estimator is temporarily unavailable.",
      500,
    );
  }
});
