/**
 * Supabase Edge Function: ai-package-comparison
 *
 * Compares 2-4 venue packages. The comparison table itself (price, guest
 * range, inclusion diff) is computed deterministically in code — never
 * trust the model for arithmetic/set-diff. The LLM call is narrative-only
 * (highlights/tradeoffs/best-for), and failure there degrades gracefully:
 * the deterministic table is still returned and useful on its own.
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500) {
  return jsonResponse({ data: null, error: { code, message } }, status);
}

function parsePackageIds(body: any): string[] | null {
  const packageIds = body?.packageIds ?? body?.package_ids;
  if (!Array.isArray(packageIds)) return null;

  const unique = [...new Set(packageIds)].filter(
    (id): id is string => typeof id === "string" && uuidPattern.test(id),
  );

  if (unique.length < 2 || unique.length > 4) return null;
  return unique;
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

type ComparisonRow = {
  id: string;
  name: string;
  venueId: string;
  venueName: string;
  venueCity: string | null;
  price: number;
  priceUnit: string;
  minGuests: number | null;
  maxGuests: number | null;
  inclusions: string[];
};

function buildComparisonTable(rows: any[]): ComparisonRow[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    venueId: row.venue_id,
    venueName: row.venues?.name ?? "Unknown venue",
    venueCity: row.venues?.city ?? null,
    price: Number(row.price),
    priceUnit: row.price_unit,
    minGuests: row.min_guests === null ? null : Number(row.min_guests),
    maxGuests: row.max_guests === null ? null : Number(row.max_guests),
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
  }));
}

type AiSummary = {
  highlights: string[];
  tradeoffs: string[];
  bestFor: { packageId: string; note: string }[];
};

function isValidSummary(
  value: any,
  validPackageIds: Set<string>,
): value is AiSummary {
  if (!value || typeof value !== "object") return false;
  if (!Array.isArray(value.highlights) || !Array.isArray(value.tradeoffs)) {
    return false;
  }
  if (!Array.isArray(value.bestFor)) return false;
  if (!value.highlights.every((item: unknown) => typeof item === "string")) {
    return false;
  }
  if (!value.tradeoffs.every((item: unknown) => typeof item === "string")) {
    return false;
  }

  return value.bestFor.every(
    (item: any) =>
      item &&
      typeof item.packageId === "string" &&
      validPackageIds.has(item.packageId) &&
      typeof item.note === "string",
  );
}

async function requestSummary(
  openRouterApiKey: string,
  table: ComparisonRow[],
  config: AiConfiguration,
): Promise<{
  summary: AiSummary | null;
  inputTokens: number | null;
  outputTokens: number | null;
  providerUsed: string;
  modelUsed: string;
}> {
  try {
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
              "You compare event venue packages for a customer. You will be given structured facts (price, guest range, inclusions) for 2-4 packages — never invent facts not given. Return JSON with: highlights (3-5 short bullets on what stands out), tradeoffs (2-4 bullets on what you give up choosing one over another), and bestFor (one entry per package: packageId plus a one-line note on what kind of event it suits best).",
          },
          {
            role: "user",
            content: JSON.stringify(table),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "package_comparison_summary",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                highlights: { type: "array", items: { type: "string" } },
                tradeoffs: { type: "array", items: { type: "string" } },
                bestFor: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      packageId: { type: "string" },
                      note: { type: "string" },
                    },
                    required: ["packageId", "note"],
                  },
                },
              },
              required: ["highlights", "tradeoffs", "bestFor"],
            },
          },
        },
      },
    );

    if (!response.ok) {
      console.error(
        "[ai-package-comparison] AI provider request failed:",
        await response.text(),
      );
      return {
        summary: null,
        inputTokens: null,
        outputTokens: null,
        providerUsed,
        modelUsed,
      };
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const tokens = extractTokenUsage(payload);
    if (typeof content !== "string") {
      return { summary: null, ...tokens, providerUsed, modelUsed };
    }

    const parsed = JSON.parse(content);
    const validIds = new Set(table.map((row) => row.id));
    return {
      summary: isValidSummary(parsed, validIds) ? parsed : null,
      ...tokens,
      providerUsed,
      modelUsed,
    };
  } catch (error) {
    console.error("[ai-package-comparison] Summary generation failed:", error);
    return {
      summary: null,
      inputTokens: null,
      outputTokens: null,
      providerUsed: config.provider,
      modelUsed: config.model,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Use POST to compare packages.",
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        "CONFIGURATION_ERROR",
        "Missing Supabase configuration.",
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // This endpoint's deterministic comparison table doesn't require AI at
    // all (see file header) — only the narrative summary does. So
    // "disabled"/misconfigured/rate-limited here means "skip the AI
    // summary, still return the table," matching this function's existing
    // graceful-degrade design, rather than failing the whole request.
    const config = await loadAiConfig(supabase, "package_comparison");
    const providerCheck = config
      ? validateProviderModel(config)
      : { ok: false as const };
    let limitCheck: { allowed: boolean; reason?: string } = { allowed: true };
    if (config?.enabled && providerCheck.ok) {
      limitCheck = await checkAiUsageLimits(
        supabase,
        "package_comparison",
        config,
      );
    }
    const aiSummaryAllowed = !!config?.enabled && providerCheck.ok &&
      limitCheck.allowed;

    const rawBody = await req.json().catch(() => null);
    const packageIds = parsePackageIds(rawBody);

    if (!packageIds) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Provide 2 to 4 unique package IDs to compare.",
        400,
      );
    }

    const { data: packageRows, error: packagesError } = await supabase
      .from("venue_packages")
      .select(
        "id, name, price, price_unit, min_guests, max_guests, inclusions, venue_id, venues(name, city, status)",
      )
      .in("id", packageIds)
      .eq("is_active", true);

    if (packagesError) {
      console.error(
        "[ai-package-comparison] Package lookup failed:",
        packagesError,
      );
      return errorResponse(
        "PACKAGE_LOOKUP_FAILED",
        "Could not look up the packages.",
        500,
      );
    }

    const publishedRows = (packageRows ?? []).filter(
      (row: any) => row.venues?.status === "published",
    );

    if (publishedRows.length < 2) {
      return errorResponse(
        "PACKAGES_NOT_FOUND",
        "At least 2 of the selected packages could not be found or are unavailable.",
        404,
      );
    }

    const comparisonTable = buildComparisonTable(publishedRows);

    let aiSummary: AiSummary | null = null;
    if (aiSummaryAllowed && openRouterApiKey && config) {
      const requestStartedAt = Date.now();
      const result = await requestSummary(
        openRouterApiKey,
        comparisonTable,
        config,
      );
      aiSummary = result.summary;
      await logAiUsage(supabase, {
        feature: "package_comparison",
        provider: result.providerUsed,
        model: result.modelUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCostCents: estimateCostCents(
          result.modelUsed,
          (result.inputTokens ?? 0) + (result.outputTokens ?? 0),
        ),
        durationMs: Date.now() - requestStartedAt,
        success: aiSummary !== null,
        errorCategory: aiSummary === null ? "provider_error_or_invalid" : null,
      });
    }

    const userId = await getAuthenticatedUserId(req, supabaseUrl);
    const { error: logError } = await supabase
      .from("ai_package_comparisons")
      .insert({
        user_id: userId,
        package_ids: comparisonTable.map((row) => row.id),
        summary: aiSummary ?? { highlights: [], tradeoffs: [], bestFor: [] },
      });

    if (logError) {
      console.error(
        "[ai-package-comparison] Failed to log comparison:",
        logError,
      );
    }

    return jsonResponse({
      data: { comparisonTable, aiSummary },
      error: null,
    });
  } catch (error) {
    console.error("[ai-package-comparison] Unexpected error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error
        ? error.message
        : "Package comparison is temporarily unavailable.",
      500,
    );
  }
});
