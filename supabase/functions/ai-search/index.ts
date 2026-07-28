/**
 * Supabase Edge Function: ai-search
 *
 * Parses natural-language venue searches via OpenRouter, then maps the
 * parsed parameters into the existing public.search_venues RPC. Venue facts
 * and ranking results always come from the database.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toVenuePayload } from "../_shared/venues.ts";
import { cleanString, normalizeText } from "../_shared/text.ts";
import {
  type AiConfiguration,
  checkAiUsageLimits,
  estimateCostCents,
  extractTokenUsage,
  loadAiConfig,
  logAiUsage,
  moderateInputText,
  postChatCompletion,
  validateProviderModel,
} from "../_shared/ai-config.ts";

type VenueType =
  | "garden"
  | "beach"
  | "resort"
  | "hotel"
  | "restaurant"
  | "church";

type IndoorOutdoor = "indoor" | "outdoor" | "both";

type RawSearchFilters = {
  q?: string;
  keyword?: string;
  province?: string;
  city?: string;
  municipality?: string;
  min_budget?: number;
  max_budget?: number;
  maxPrice?: number;
  guests?: number;
  capacity?: number;
  venue_types?: string[];
  indoor_outdoor?: string;
  parking?: boolean;
  pet_friendly?: boolean;
  wheelchair_accessible?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
};

type SearchRequest = {
  query?: string;
  filters?: RawSearchFilters;
};

type ServiceClient = ReturnType<typeof createClient<any>>;
type LocationRow = {
  province: string | null;
  city: string | null;
  municipality: string | null;
};

type ExtractedSearchParameters = {
  max_price: number | null;
  location: string | null;
  venue_type: string | null;
  keywords: string[];
};

type SearchIntent = {
  province: string | null;
  city: string | null;
  municipality: string | null;
  minBudget: number | null;
  maxBudget: number | null;
  guests: number | null;
  venueTypes: VenueType[];
  indoorOutdoor: IndoorOutdoor | null;
  parking: boolean;
  petFriendly: boolean;
  wheelchairAccessible: boolean;
  keyword: string | null;
  confidence: number;
};

type LocationMatch = Pick<SearchIntent, "province" | "city" | "municipality">;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const venueTypes: VenueType[] = [
  "garden",
  "beach",
  "resort",
  "hotel",
  "restaurant",
  "church",
];
const indoorOutdoorValues: IndoorOutdoor[] = ["indoor", "outdoor", "both"];
const featureKeywords = new Map<
  string,
  keyof Pick<SearchIntent, "parking" | "petFriendly" | "wheelchairAccessible">
>([
  ["parking", "parking"],
  ["car park", "parking"],
  ["pet friendly", "petFriendly"],
  ["pet-friendly", "petFriendly"],
  ["pets", "petFriendly"],
  ["wheelchair", "wheelchairAccessible"],
  ["accessible", "wheelchairAccessible"],
  ["wheelchair accessible", "wheelchairAccessible"],
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500) {
  return jsonResponse({ data: null, error: { code, message } }, status);
}

function toPositiveNumber(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function parseCurrencyToken(rawValue: string, suffix = "") {
  const value = Number(rawValue.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;

  const normalizedSuffix = normalizeText(suffix);
  if (normalizedSuffix === "m" || normalizedSuffix === "million") {
    return Math.round(value * 1_000_000);
  }

  if (normalizedSuffix === "k" || normalizedSuffix === "thousand") {
    return Math.round(value * 1_000);
  }

  return Math.round(value);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [
    ...new Set(values.map((value) => cleanString(value)).filter(Boolean)),
  ].map((value) => value as string);
}

function deterministicExtraction(
  query: string,
): Partial<ExtractedSearchParameters> {
  const text = normalizeText(query);
  const budgetMatch = text.match(
    /(?:budget|under|below|less than|up to|max(?:imum)?|not more than|only)\D*([0-9][0-9,.]*)(k|m|thousand|million)?/,
  );
  const maxPrice = budgetMatch
    ? parseCurrencyToken(budgetMatch[1], budgetMatch[2])
    : null;
  const venueType = indoorOutdoorValues.find((value) => text.includes(value)) ??
    venueTypes.find((value) => text.includes(value)) ??
    null;
  const keywords = uniqueStrings(
    [...featureKeywords.keys()].filter((keyword) => text.includes(keyword)),
  );

  return {
    max_price: maxPrice,
    venue_type: venueType,
    keywords,
  };
}

function normalizeExtractedParameters(
  parsed: Partial<ExtractedSearchParameters>,
  deterministic: Partial<ExtractedSearchParameters>,
): ExtractedSearchParameters {
  const maxPrice = toPositiveNumber(parsed.max_price) ??
    toPositiveNumber(deterministic.max_price);
  const location = cleanString(parsed.location)?.toLowerCase() ?? null;
  const venueType = cleanString(parsed.venue_type)?.toLowerCase() ?? null;
  const keywords = uniqueStrings([
    ...(Array.isArray(parsed.keywords) ? parsed.keywords : []),
    ...(Array.isArray(deterministic.keywords) ? deterministic.keywords : []),
  ])
    .map((keyword) => keyword.toLowerCase())
    .filter(
      (keyword) =>
        ![
          "budget",
          "price",
          "cost",
          "cheap",
          "affordable",
          "only",
          "venue",
          "venues",
        ].includes(keyword),
    )
    .slice(0, 12);

  return {
    max_price: maxPrice,
    location,
    venue_type: venueType,
    keywords,
  };
}

function extractChatContent(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  return null;
}

async function parseQueryWithOpenRouter(
  query: string,
  openRouterApiKey: string,
  config: AiConfiguration,
): Promise<
  ExtractedSearchParameters & {
    inputTokens: number | null;
    outputTokens: number | null;
    providerUsed: string;
    modelUsed: string;
  }
> {
  const deterministic = deterministicExtraction(query);
  const { response, providerUsed, modelUsed } = await postChatCompletion(
    config,
    openRouterApiKey,
    {
      temperature: config.temperature ?? 0,
      // Generous budget: the approved model may consume part of the token
      // budget while reasoning before writing `content`; too low a cap can
      // truncate the response with content: null.
      max_tokens: config.maxTokens,
      messages: [
        {
          role: "system",
          content:
            "Extract venue search parameters from natural language. Convert shorthand budgets like 100k to 100000. Return JSON containing only fields in the schema. Use lowercase strings. Put amenities or features such as parking, pool, wifi, beachfront, pet friendly, or wheelchair accessible in keywords. Do not put budget phrases in keywords.",
        },
        {
          role: "user",
          content: query,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "venue_search_parameters",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              max_price: { type: ["number", "null"] },
              location: { type: ["string", "null"] },
              venue_type: { type: ["string", "null"] },
              keywords: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["max_price", "location", "venue_type", "keywords"],
          },
        },
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI query parsing failed: ${errorText}`);
  }

  const payload = await response.json();
  const content = extractChatContent(payload);
  if (!content) {
    throw new Error("AI provider returned no JSON content for query parsing.");
  }

  return {
    ...normalizeExtractedParameters(JSON.parse(content), deterministic),
    ...extractTokenUsage(payload),
    providerUsed,
    modelUsed,
  };
}

function normalizeVenueType(value: string | null): VenueType | null {
  const normalized = normalizeText(value).replace(/\s+/g, "-");
  return (
    venueTypes.find(
      (venueType) =>
        venueType === normalized ||
        normalized.includes(venueType) ||
        venueType.includes(normalized),
    ) ?? null
  );
}

function normalizeIndoorOutdoor(value: string | null): IndoorOutdoor | null {
  const normalized = normalizeText(value);
  if (normalized === "indoor") return "indoor";
  if (normalized === "outdoor") return "outdoor";
  if (normalized === "both" || normalized === "indoor/outdoor") return "both";
  return null;
}

function explicitVenueTypes(filters?: RawSearchFilters): VenueType[] {
  if (!Array.isArray(filters?.venue_types)) return [];

  return [
    ...new Set(
      filters.venue_types
        .map((value) => normalizeVenueType(value))
        .filter(Boolean) as VenueType[],
    ),
  ];
}

async function resolveLocation(
  supabase: ServiceClient,
  location: string | null,
): Promise<LocationMatch> {
  if (!location) return { province: null, city: null, municipality: null };

  const normalizedLocation = normalizeText(location);
  const { data, error } = await supabase
    .from("venues")
    .select("province, city, municipality")
    .eq("status", "published")
    .limit(500);

  if (error || !data) {
    return { province: location, city: null, municipality: null };
  }

  const rows = data as LocationRow[];
  for (const row of rows) {
    if (normalizeText(row.province) === normalizedLocation) {
      return { province: row.province, city: null, municipality: null };
    }
  }

  for (const row of rows) {
    if (normalizeText(row.city) === normalizedLocation) {
      return { province: null, city: row.city, municipality: null };
    }
  }

  for (const row of rows) {
    if (normalizeText(row.municipality) === normalizedLocation) {
      return { province: null, city: null, municipality: row.municipality };
    }
  }

  return { province: location, city: null, municipality: null };
}

function keywordHas(keywords: string[], values: string[]) {
  return keywords.some((keyword) => {
    const normalized = normalizeText(keyword);
    return values.some((value) => normalized.includes(value));
  });
}

function buildKeyword(parameters: ExtractedSearchParameters) {
  const filterOnlyKeywords = [
    "parking",
    "car park",
    "pet friendly",
    "pet-friendly",
    "pets",
    "wheelchair",
    "accessible",
    "wheelchair accessible",
  ];

  const searchKeywords = parameters.keywords.filter((keyword) => {
    const normalized = normalizeText(keyword);
    return !filterOnlyKeywords.some((filterKeyword) =>
      normalized.includes(filterKeyword)
    );
  });

  return searchKeywords.length > 0 ? searchKeywords.join(" ") : null;
}

async function buildIntent(
  supabase: ServiceClient,
  parameters: ExtractedSearchParameters,
  filters?: RawSearchFilters,
): Promise<SearchIntent> {
  const locationMatch = await resolveLocation(supabase, parameters.location);
  const parsedVenueType = normalizeVenueType(parameters.venue_type);
  const parsedIndoorOutdoor = normalizeIndoorOutdoor(parameters.venue_type);
  const filterIndoorOutdoor = normalizeIndoorOutdoor(
    filters?.indoor_outdoor ?? null,
  );
  const venueTypes = [
    ...new Set([
      ...explicitVenueTypes(filters),
      ...(parsedVenueType ? [parsedVenueType] : []),
    ]),
  ];
  const keywords = parameters.keywords;

  return {
    province: cleanString(filters?.province) ?? locationMatch.province,
    city: cleanString(filters?.city) ?? locationMatch.city,
    municipality: cleanString(filters?.municipality) ??
      locationMatch.municipality,
    minBudget: toPositiveNumber(filters?.min_budget),
    maxBudget: parameters.max_price ??
      toPositiveNumber(filters?.max_budget) ??
      toPositiveNumber(filters?.maxPrice),
    guests: toPositiveNumber(filters?.guests) ??
      toPositiveNumber(filters?.capacity),
    venueTypes,
    indoorOutdoor: filterIndoorOutdoor ?? parsedIndoorOutdoor,
    parking: filters?.parking === true || keywordHas(keywords, ["parking"]),
    petFriendly: filters?.pet_friendly === true ||
      keywordHas(keywords, ["pet friendly", "pet-friendly", "pets"]),
    wheelchairAccessible: filters?.wheelchair_accessible === true ||
      keywordHas(keywords, ["wheelchair", "accessible"]),
    keyword: cleanString(filters?.keyword ?? filters?.q) ??
      buildKeyword(parameters),
    confidence: 1,
  };
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
    return errorResponse("METHOD_NOT_ALLOWED", "Use POST for AI search.", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        "CONFIGURATION_ERROR",
        "AI search is missing Supabase configuration.",
        500,
      );
    }

    if (!openRouterApiKey) {
      return errorResponse(
        "OPENROUTER_NOT_CONFIGURED",
        "OPENROUTER_API_KEY is not configured for ai-search.",
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Natural-language parsing is the "AI feature" here — a filters-only
    // search never calls the LLM at all (see the ternary below). When AI
    // parsing is disabled/rate-limited, a free-text query still gets
    // *some* interpretation via the existing deterministic (regex-based)
    // extraction rather than failing the whole search.
    const searchAiConfig = await loadAiConfig(supabase, "search");
    const searchProviderCheck = searchAiConfig
      ? validateProviderModel(searchAiConfig)
      : { ok: false as const };
    let searchLimitCheck: { allowed: boolean; reason?: string } = {
      allowed: true,
    };
    if (searchAiConfig?.enabled && searchProviderCheck.ok) {
      searchLimitCheck = await checkAiUsageLimits(
        supabase,
        "search",
        searchAiConfig,
      );
    }
    const aiParsingAllowed = !!searchAiConfig?.enabled &&
      searchProviderCheck.ok &&
      searchLimitCheck.allowed;

    const body = (await req.json().catch(() => null)) as SearchRequest | null;
    const filters = body?.filters ?? {};
    const query = cleanString(body?.query, 500) ??
      cleanString(filters.q ?? filters.keyword, 500) ??
      "";

    if (!query && Object.keys(filters).length === 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Enter a search query or choose at least one filter.",
        400,
      );
    }

    if (query && searchAiConfig?.moderationEnabled) {
      const moderation = moderateInputText(query);
      if (!moderation.allowed) {
        return errorResponse("AI_MODERATION_BLOCKED", moderation.reason!, 400);
      }
    }

    let parameters: ExtractedSearchParameters;
    if (query && aiParsingAllowed) {
      const requestStartedAt = Date.now();
      try {
        const result = await parseQueryWithOpenRouter(
          query,
          openRouterApiKey,
          searchAiConfig!,
        );
        parameters = result;
        await logAiUsage(supabase, {
          feature: "search",
          provider: result.providerUsed,
          model: result.modelUsed,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          estimatedCostCents: estimateCostCents(
            result.modelUsed,
            (result.inputTokens ?? 0) + (result.outputTokens ?? 0),
          ),
          durationMs: Date.now() - requestStartedAt,
          success: true,
        });
      } catch (error) {
        await logAiUsage(supabase, {
          feature: "search",
          provider: searchAiConfig!.provider,
          model: searchAiConfig!.model,
          durationMs: Date.now() - requestStartedAt,
          success: false,
          errorCategory: "provider_error",
        });
        throw error;
      }
    } else if (query) {
      parameters = normalizeExtractedParameters(
        {},
        deterministicExtraction(query),
      );
    } else {
      parameters = normalizeExtractedParameters({}, {});
    }
    const intent = await buildIntent(supabase, parameters, filters);
    const matchCount = Math.min(
      50,
      Math.max(1, Number(filters.per_page ?? 24)),
    );

    const { data: venueRows, error: searchError } = await supabase.rpc(
      "search_venues",
      {
        query_embedding: null,
        keyword: intent.keyword,
        filter_province: intent.province,
        filter_city: intent.city,
        filter_municipality: intent.municipality,
        filter_min_price: intent.minBudget,
        filter_max_price: intent.maxBudget,
        filter_guests: intent.guests,
        filter_venue_types: intent.venueTypes,
        filter_indoor_outdoor: intent.indoorOutdoor,
        filter_parking: intent.parking ? true : null,
        filter_pet_friendly: intent.petFriendly ? true : null,
        filter_wheelchair_accessible: intent.wheelchairAccessible ? true : null,
        match_count: matchCount,
        sort_by: filters.sort_by ?? "relevance",
      },
    );

    if (searchError) {
      console.error("[ai-search] Search RPC failed:", searchError);
      return errorResponse(
        "SEARCH_FAILED",
        "AI search could not complete. Please try again.",
        500,
      );
    }

    const venues = (venueRows ?? []).map(toVenuePayload);
    const userId = await getAuthenticatedUserId(req, supabaseUrl);
    const { error: logError } = await supabase.from("ai_search_logs").insert({
      user_id: userId,
      query_text: query || intent.keyword || "filter search",
      parsed_filters: { ...intent, searchParameters: parameters },
      results_count: venues.length,
    });

    if (logError) {
      console.error("[ai-search] Failed to write search log:", logError);
    }

    return jsonResponse({
      data: {
        venues,
        parsedFilters: intent,
        searchParameters: parameters,
        fallbackReason: null,
        embeddedVenueCount: 0,
      },
      error: null,
    });
  } catch (error) {
    console.error("[ai-search] Unexpected error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error
        ? error.message
        : "AI search is temporarily unavailable.",
      500,
    );
  }
});
