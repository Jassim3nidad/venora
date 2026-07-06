/**
 * Supabase Edge Function: ai-search
 *
 * Smart venue search for Venora:
 * - Parses natural language search intent with OpenAI Structured Outputs.
 * - Generates query embeddings with OpenAI embeddings.
 * - Warms missing venue embeddings in small batches.
 * - Executes hybrid PostgreSQL search with typed filters and logs usage.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type VenueType =
  "garden" | "beach" | "resort" | "hotel" | "restaurant" | "church";

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

type SearchRequest = {
  query?: string;
  filters?: RawSearchFilters;
};

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

const openAiBaseUrl = "https://api.openai.com/v1";
const defaultSearchModel = "gpt-5.4-mini";
const defaultEmbeddingModel = "text-embedding-3-small";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500) {
  return jsonResponse({ data: null, error: { code, message } }, status);
}

function cleanString(value: unknown, maxLength = 120) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function toPositiveNumber(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function parseCurrencyToken(rawValue: string, suffix = "") {
  const value = Number(rawValue.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;

  const normalizedSuffix = suffix.toLowerCase();
  if (normalizedSuffix === "m" || normalizedSuffix === "million") {
    return Math.round(value * 1_000_000);
  }

  if (normalizedSuffix === "k" || normalizedSuffix === "thousand") {
    return Math.round(value * 1_000);
  }

  return Math.round(value);
}

function normalizeVenueType(value: string): VenueType | null {
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

function normalizeIndoorOutdoor(value: unknown): IndoorOutdoor | null {
  const normalized = normalizeText(value);

  if (normalized === "indoor") return "indoor";
  if (normalized === "outdoor") return "outdoor";
  if (normalized === "both" || normalized === "indoor/outdoor") return "both";

  return null;
}

function uniqueVenueTypes(values: unknown): VenueType[] {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map((value) => normalizeVenueType(String(value)))
        .filter(Boolean) as VenueType[],
    ),
  ];
}

function mergeExplicitFilters(
  intent: SearchIntent,
  filters?: RawSearchFilters,
) {
  if (!filters) return intent;

  const explicitVenueTypes = uniqueVenueTypes(filters.venue_types);
  const indoorOutdoor = normalizeIndoorOutdoor(filters.indoor_outdoor);

  return compactIntent({
    ...intent,
    province: cleanString(filters.province) ?? intent.province,
    city: cleanString(filters.city) ?? intent.city,
    municipality: cleanString(filters.municipality) ?? intent.municipality,
    minBudget: toPositiveNumber(filters.min_budget) ?? intent.minBudget,
    maxBudget:
      toPositiveNumber(filters.max_budget) ??
      toPositiveNumber(filters.maxPrice) ??
      intent.maxBudget,
    guests:
      toPositiveNumber(filters.guests) ??
      toPositiveNumber(filters.capacity) ??
      intent.guests,
    venueTypes:
      explicitVenueTypes.length > 0 ? explicitVenueTypes : intent.venueTypes,
    indoorOutdoor: indoorOutdoor ?? intent.indoorOutdoor,
    parking: filters.parking === true || intent.parking,
    petFriendly: filters.pet_friendly === true || intent.petFriendly,
    wheelchairAccessible:
      filters.wheelchair_accessible === true || intent.wheelchairAccessible,
    keyword: cleanString(filters.keyword ?? filters.q) ?? intent.keyword,
  });
}

function inferDeterministicKeyword(
  query: string,
  text: string,
  hasStructuredIntent: boolean,
) {
  const keywordHints = [
    "rooftop",
    "ballroom",
    "loft",
    "pavilion",
    "chapel",
    "farm",
    "estate",
    "villa",
    "hall",
    "cafe",
    "sea view",
    "mountain view",
  ];
  const keywordHint = keywordHints.find((hint) => text.includes(hint));

  if (keywordHint) return keywordHint;
  if (hasStructuredIntent) return null;

  return cleanString(query, 160);
}

function compactIntent(input: Partial<SearchIntent>): SearchIntent {
  return {
    province: cleanString(input.province),
    city: cleanString(input.city),
    municipality: cleanString(input.municipality),
    minBudget: toPositiveNumber(input.minBudget),
    maxBudget: toPositiveNumber(input.maxBudget),
    guests: toPositiveNumber(input.guests),
    venueTypes: uniqueVenueTypes(input.venueTypes),
    indoorOutdoor: normalizeIndoorOutdoor(input.indoorOutdoor),
    parking: input.parking === true,
    petFriendly: input.petFriendly === true,
    wheelchairAccessible: input.wheelchairAccessible === true,
    keyword: cleanString(input.keyword),
    confidence: Math.min(
      1,
      Math.max(
        0,
        Number.isFinite(input.confidence) ? (input.confidence ?? 0) : 0,
      ),
    ),
  };
}

function deterministicIntent(query = "", filters?: RawSearchFilters) {
  const text = normalizeText(query);
  const detectedTypes = venueTypes.filter((type) => text.includes(type));
  const budgetMatch = text.match(
    /(?:under|below|less than|up to|max(?:imum)?)\s*(?:php|₱|p)?\s*([0-9][0-9,.]*)(k|m|thousand|million)?/,
  );
  const minBudgetMatch = text.match(
    /(?:from|above|over|at least|min(?:imum)?)\s*(?:php|₱|p)?\s*([0-9][0-9,.]*)(k|m|thousand|million)?/,
  );
  const guestMatch = text.match(
    /([0-9][0-9,.]*)\s*(?:guests|guest|pax|people|persons)/,
  );

  const locationHints: Partial<
    Pick<SearchIntent, "province" | "city" | "municipality">
  > = {};

  if (text.includes("tagaytay")) {
    locationHints.city = "Tagaytay City";
    locationHints.municipality = "Tagaytay";
    locationHints.province = "Cavite";
  } else if (text.includes("makati")) {
    locationHints.city = "Makati City";
    locationHints.municipality = "Makati";
    locationHints.province = "Metro Manila";
  } else if (text.includes("bgc") || text.includes("taguig")) {
    locationHints.city = "Taguig City";
    locationHints.municipality = "Taguig";
    locationHints.province = "Metro Manila";
  } else if (text.includes("nasugbu") || text.includes("batangas")) {
    locationHints.city = text.includes("nasugbu") ? "Nasugbu" : null;
    locationHints.municipality = text.includes("nasugbu") ? "Nasugbu" : null;
    locationHints.province = "Batangas";
  } else if (text.includes("antipolo") || text.includes("rizal")) {
    locationHints.city = text.includes("antipolo") ? "Antipolo" : null;
    locationHints.municipality = text.includes("antipolo") ? "Antipolo" : null;
    locationHints.province = "Rizal";
  } else if (text.includes("malolos") || text.includes("bulacan")) {
    locationHints.city = text.includes("malolos") ? "Malolos City" : null;
    locationHints.municipality = text.includes("malolos") ? "Malolos" : null;
    locationHints.province = "Bulacan";
  }

  const indoorOutdoor =
    text.includes("indoor and outdoor") || text.includes("indoor/outdoor")
      ? "both"
      : text.includes("outdoor")
        ? "outdoor"
        : text.includes("indoor")
          ? "indoor"
          : null;
  const hasStructuredIntent = Boolean(
    locationHints.province ||
      locationHints.city ||
      locationHints.municipality ||
      budgetMatch ||
      minBudgetMatch ||
      guestMatch ||
      detectedTypes.length > 0 ||
      indoorOutdoor ||
      text.includes("parking") ||
      text.includes("pet friendly") ||
      text.includes("pets") ||
      text.includes("wheelchair") ||
      text.includes("accessible"),
  );

  const intent = compactIntent({
    ...locationHints,
    minBudget: minBudgetMatch
      ? parseCurrencyToken(minBudgetMatch[1], minBudgetMatch[2])
      : null,
    maxBudget: budgetMatch
      ? parseCurrencyToken(budgetMatch[1], budgetMatch[2])
      : null,
    guests: guestMatch ? parseCurrencyToken(guestMatch[1]) : null,
    venueTypes: detectedTypes,
    indoorOutdoor,
    parking: text.includes("parking"),
    petFriendly: text.includes("pet friendly") || text.includes("pets"),
    wheelchairAccessible:
      text.includes("wheelchair") || text.includes("accessible"),
    keyword: inferDeterministicKeyword(query, text, hasStructuredIntent),
    confidence: text ? 0.45 : 0,
  });

  return mergeExplicitFilters(intent, filters);
}

function structuredOutputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      province: { type: ["string", "null"] },
      city: { type: ["string", "null"] },
      municipality: { type: ["string", "null"] },
      minBudget: { type: ["number", "null"] },
      maxBudget: { type: ["number", "null"] },
      guests: { type: ["number", "null"] },
      venueTypes: {
        type: "array",
        items: { type: "string", enum: venueTypes },
      },
      indoorOutdoor: {
        type: ["string", "null"],
        enum: ["indoor", "outdoor", "both", null],
      },
      parking: { type: "boolean" },
      petFriendly: { type: "boolean" },
      wheelchairAccessible: { type: "boolean" },
      keyword: { type: ["string", "null"] },
      confidence: { type: "number" },
    },
    required: [
      "province",
      "city",
      "municipality",
      "minBudget",
      "maxBudget",
      "guests",
      "venueTypes",
      "indoorOutdoor",
      "parking",
      "petFriendly",
      "wheelchairAccessible",
      "keyword",
      "confidence",
    ],
  };
}

function extractResponseText(payload: any) {
  if (typeof payload.output_text === "string") return payload.output_text;

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") return content.text;
      if (typeof content.output_text === "string") return content.output_text;
    }
  }

  return null;
}

async function parseIntentWithOpenAI(
  query: string,
  filters: RawSearchFilters | undefined,
  openAiApiKey: string,
) {
  const response = await fetch(`${openAiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_SEARCH_MODEL") ?? defaultSearchModel,
      input: [
        {
          role: "system",
          content:
            "Extract structured venue search filters for Venora. Use Philippine location names when clear. Return null for unknown optional fields. Do not invent unavailable constraints.",
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            explicitFilters: filters ?? {},
            supportedVenueTypes: venueTypes,
            supportedIndoorOutdoor: ["indoor", "outdoor", "both"],
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "venue_search_intent",
          strict: true,
          schema: structuredOutputSchema(),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI intent parsing failed: ${errorText}`);
  }

  const payload = await response.json();
  const outputText = extractResponseText(payload);

  if (!outputText) {
    throw new Error("OpenAI intent parsing returned no text output.");
  }

  return mergeExplicitFilters(compactIntent(JSON.parse(outputText)), filters);
}

async function createEmbeddings(inputs: string[], openAiApiKey: string) {
  if (inputs.length === 0) return [];

  const response = await fetch(`${openAiBaseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? defaultEmbeddingModel,
      input: inputs,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI embedding failed: ${errorText}`);
  }

  const payload = await response.json();

  return (payload.data ?? [])
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((item: { embedding: number[] }) => item.embedding);
}

async function refreshMissingVenueEmbeddings(
  supabase: ReturnType<typeof createClient>,
  openAiApiKey: string | null,
) {
  if (!openAiApiKey) return 0;

  const refreshLimit = Math.min(
    25,
    Math.max(0, Number(Deno.env.get("AI_SEARCH_EMBED_REFRESH_LIMIT") ?? 8)),
  );

  if (refreshLimit === 0) return 0;

  const { data, error } = await supabase.rpc("venues_for_embedding", {
    refresh_limit: refreshLimit,
  });

  if (error || !data || data.length === 0) return 0;

  const embeddings = await createEmbeddings(
    data.map((venue: { embedding_text: string }) => venue.embedding_text),
    openAiApiKey,
  );

  const records = data
    .map((venue: { id: string }, index: number) => ({
      venue_id: venue.id,
      embedding: embeddings[index],
      updated_at: new Date().toISOString(),
    }))
    .filter((record: { embedding?: number[] }) =>
      Array.isArray(record.embedding),
    );

  if (records.length === 0) return 0;

  const { error: upsertError } = await supabase
    .from("venue_embeddings")
    .upsert(records, { onConflict: "venue_id" });

  if (upsertError) {
    console.error(
      "[ai-search] Failed to upsert venue embeddings:",
      upsertError,
    );
    return 0;
  }

  return records.length;
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

function buildEmbeddingQuery(query: string, intent: SearchIntent) {
  return [
    query,
    intent.keyword,
    intent.province,
    intent.city,
    intent.municipality,
    intent.guests ? `${intent.guests} guests` : "",
    intent.maxBudget ? `budget ${intent.maxBudget}` : "",
    ...intent.venueTypes,
    intent.indoorOutdoor,
    intent.parking ? "parking" : "",
    intent.petFriendly ? "pet friendly" : "",
    intent.wheelchairAccessible ? "wheelchair accessible" : "",
  ]
    .filter(Boolean)
    .join(" ");
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

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        "CONFIGURATION_ERROR",
        "AI search is not configured correctly.",
        500,
      );
    }

    const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? null;
    const body = (await req.json().catch(() => null)) as SearchRequest | null;
    const query = cleanString(body?.query, 500) ?? "";
    const filters = body?.filters ?? {};

    if (!query && Object.keys(filters).length === 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Enter a search query or choose at least one filter.",
        400,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    let fallbackReason: string | null = null;
    let intent = deterministicIntent(query, filters);

    if (openAiApiKey && query) {
      try {
        intent = await parseIntentWithOpenAI(query, filters, openAiApiKey);
      } catch (error) {
        fallbackReason =
          "AI intent parsing fell back to deterministic parsing.";
        console.error("[ai-search] Intent parser fallback:", error);
      }
    } else if (!openAiApiKey) {
      fallbackReason = "OPENAI_API_KEY is not configured.";
    }

    let embeddedVenueCount = 0;
    try {
      embeddedVenueCount = await refreshMissingVenueEmbeddings(
        supabase,
        openAiApiKey,
      );
    } catch (error) {
      console.error("[ai-search] Venue embedding refresh failed:", error);
    }

    let queryEmbedding: number[] | null = null;
    const embeddingQuery = buildEmbeddingQuery(query, intent);

    if (openAiApiKey && embeddingQuery) {
      try {
        queryEmbedding =
          (await createEmbeddings([embeddingQuery], openAiApiKey))[0] ?? null;
      } catch (error) {
        fallbackReason =
          fallbackReason ?? "Semantic search fell back to keyword search.";
        console.error("[ai-search] Query embedding fallback:", error);
      }
    }

    const matchCount = Math.min(
      50,
      Math.max(1, Number(filters.per_page ?? 24)),
    );
    const sortBy = filters.sort_by ?? "relevance";
    const hasStructuredSearchFilters = Boolean(
      intent.province ||
        intent.city ||
        intent.municipality ||
        intent.minBudget ||
        intent.maxBudget ||
        intent.guests ||
        intent.venueTypes.length > 0 ||
        intent.indoorOutdoor ||
        intent.parking ||
        intent.petFriendly ||
        intent.wheelchairAccessible,
    );
    const searchKeyword =
      intent.keyword ?? (hasStructuredSearchFilters ? null : query || null);

    const { data: venueRows, error: searchError } = await supabase.rpc(
      "search_venues",
      {
        query_embedding: queryEmbedding,
        keyword: searchKeyword,
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
        sort_by: sortBy,
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

    const venues = (venueRows ?? []).map((venue: any) => ({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      city: venue.city,
      province: venue.province,
      municipality: venue.municipality,
      basePrice: venue.base_price === null ? null : Number(venue.base_price),
      capacityMin:
        venue.capacity_min === null ? null : Number(venue.capacity_min),
      capacityMax:
        venue.capacity_max === null ? null : Number(venue.capacity_max),
      indoorOutdoor: venue.indoor_outdoor,
      parkingAvailable: venue.parking_available,
      petFriendly: venue.pet_friendly,
      wheelchairAccessible: venue.wheelchair_accessible,
      avgRating: venue.avg_rating === null ? null : Number(venue.avg_rating),
      similarity:
        venue.similarity === null ? null : Number(venue.similarity ?? 0),
      relevanceScore:
        venue.relevance_score === null
          ? null
          : Number(venue.relevance_score ?? 0),
      categories: venue.categories ?? [],
      amenities: venue.amenities ?? [],
      eventTypes: venue.event_types ?? [],
    }));

    const userId = await getAuthenticatedUserId(req, supabaseUrl);
    const { error: logError } = await supabase.from("ai_search_logs").insert({
      user_id: userId,
      query_text: query || intent.keyword || "filter search",
      parsed_filters: intent,
      results_count: venues.length,
    });

    if (logError) {
      console.error("[ai-search] Failed to write search log:", logError);
    }

    return jsonResponse({
      data: {
        venues,
        parsedFilters: intent,
        fallbackReason,
        embeddedVenueCount,
      },
      error: null,
    });
  } catch (error) {
    console.error("[ai-search] Unexpected error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "AI search is temporarily unavailable.",
      500,
    );
  }
});
