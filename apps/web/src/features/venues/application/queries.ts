import { SupabaseClient } from "@supabase/supabase-js";

export interface VenueSearchParams {
  q?: string | undefined;
  province?: string | undefined;
  city?: string | undefined;
  municipality?: string | undefined;
  location?: string | undefined;
  event?: string | undefined;
  budget?: string | undefined;
  minBudget?: string | undefined;
  maxBudget?: string | undefined;
  capacity?: string | undefined;
  venueTypes?: string[] | undefined;
  indoorOutdoor?: string | undefined;
  amenities?: string[] | undefined;
  venueIds?: string[] | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const amount = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function sanitizeLocationPart(value: string) {
  return value.replace(/[()",]/g, " ").replace(/\s+/g, " ").trim();
}

export function parseMarketplaceLocation(value: string) {
  const parts = value.split(",");
  const locality = sanitizeLocationPart(parts[0]?.split("(")[0] ?? "");
  const province =
    parts.length > 1
      ? sanitizeLocationPart(parts[parts.length - 1] ?? "")
      : "";

  return {
    locality,
    ...(province ? { province } : {}),
  };
}

// SupabaseClient generic typing can conflict with generated Database types
// We use any here since the query result is processed dynamically anyway.
export async function searchMarketplaceVenues(
  supabase: any,
  params: VenueSearchParams,
) {
  let query = supabase
    .from("venues")
    .select(
      `
      *,
      venue_images(storage_path, is_featured, display_order),
      venue_category_assignments${params.venueTypes?.length ? "!inner" : ""}(venue_categories${params.venueTypes?.length ? "!inner" : ""}(name, slug)),
      venue_event_types${params.event ? "!inner" : ""}(event_types${params.event ? "!inner" : ""}(name, slug)),
      venue_amenities${params.amenities?.length ? "!inner" : ""}(amenities${params.amenities?.length ? "!inner" : ""}(name))
    `,
    )
    .eq("status", "published");

  if (params.venueIds?.length) {
    query = query.in("id", params.venueIds);
  }

  if (params.q) {
    // Sanitize to prevent PostgREST syntax errors (commas, quotes, parentheses break .or)
    const q = params.q.replace(/[,()"]/g, "").trim();
    if (q) {
      query = query.or(
        `name.ilike.%${q}%,city.ilike.%${q}%,province.ilike.%${q}%,municipality.ilike.%${q}%`,
      );
    }
  }

  if (params.province) {
    query = query.ilike("province", `%${params.province}%`);
  }
  if (params.city) {
    query = query.ilike("city", `%${params.city}%`);
  }
  if (params.municipality) {
    query = query.ilike("municipality", `%${params.municipality}%`);
  }

  if (params.location) {
    const location = parseMarketplaceLocation(params.location);
    if (location.locality) {
      query = query.or(
        `city.ilike.%${location.locality}%,municipality.ilike.%${location.locality}%,province.ilike.%${location.locality}%`,
      );
      if (location.province) {
        query = query.ilike("province", `%${location.province}%`);
      }
    }
  }

  if (params.capacity) {
    const capacity = Number(params.capacity);
    if (!Number.isNaN(capacity) && capacity > 0) {
      query = query.gte("capacity_max", capacity);
    }
  }

  if (params.indoorOutdoor) {
    if (
      params.indoorOutdoor === "indoor" ||
      params.indoorOutdoor === "outdoor"
    ) {
      query = query.in("indoor_outdoor", [params.indoorOutdoor, "both"]);
    } else if (params.indoorOutdoor === "both") {
      query = query.eq("indoor_outdoor", "both");
    }
  }

  // Budget
  let min = parseMoney(params.minBudget);
  let max = parseMoney(params.maxBudget);
  if (params.budget) {
    if (params.budget === "under-100k") {
      max = 100000;
    } else if (params.budget === "100k-300k") {
      min = 100000;
      max = 300000;
    } else if (params.budget === "luxury") {
      min = 300000;
    }
  }
  if (min > 0) query = query.gte("base_price", min);
  if (max > 0) query = query.lte("base_price", max);

  // Filters by related tables
  if (params.event) {
    query = query.ilike(
      "venue_event_types.event_types.name",
      `%${params.event}%`,
    );
  }

  if (params.venueTypes && params.venueTypes.length > 0) {
    const typesFilters = params.venueTypes
      .map((t) => t.replace(/[,()"]/g, "").trim())
      .filter(Boolean)
      .map(
        (safeT) =>
          `venue_category_assignments.venue_categories.name.ilike.%${safeT}%`,
      )
      .join(",");
    if (typesFilters) query = query.or(typesFilters);
  }

  // Handling amenities is tricky in PostgREST for exact matches across a many-to-many.
  // Using an IN clause on the nested table acts as an OR. To mandate ALL amenities,
  // we would need multiple joins which PostgREST doesn't support easily.
  // As a compromise, we'll apply an IN clause (which guarantees AT LEAST one amenity matches)
  // and then the client can do the strict filtering if needed, OR we can filter strictly on boolean columns.
  const booleanAmenities = [];
  const textAmenities = [];
  for (const am of params.amenities || []) {
    const norm = am.toLowerCase();
    if (norm.includes("park"))
      booleanAmenities.push({ col: "parking_available", val: true });
    else if (norm.includes("air"))
      booleanAmenities.push({ col: "air_conditioned", val: true });
    else if (norm.includes("pet"))
      booleanAmenities.push({ col: "pet_friendly", val: true });
    else if (norm.includes("wheelchair") || norm.includes("accessible"))
      booleanAmenities.push({ col: "wheelchair_accessible", val: true });
    else if (norm.includes("pool"))
      booleanAmenities.push({ col: "has_pool", val: true });
    else if (norm.includes("overnight") || norm.includes("accommodation"))
      booleanAmenities.push({ col: "overnight_accommodation", val: true });
    else textAmenities.push(am);
  }

  for (const { col, val } of booleanAmenities) {
    query = query.eq(col, val);
  }

  if (textAmenities.length > 0) {
    const amFilters = textAmenities
      .map((a) => a.replace(/[,()"]/g, "").trim())
      .filter(Boolean)
      .map((safeA) => `venue_amenities.amenities.name.ilike.%${safeA}%`)
      .join(",");
    if (amFilters) query = query.or(amFilters);
  }

  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 12;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return query.order("created_at", { ascending: false }).range(from, to);
}

export async function getLandingSearchSuggestionVenues(supabase: any) {
  return supabase
    .from("venues")
    .select(
      `
        id,
        city,
        province,
        venue_event_types(event_types(name))
      `,
    )
    .eq("status", "published")
    .order("name", { ascending: true });
}

/** Latest ai_generated_content draft/approved/rejected row per content type for a venue. */
export async function getLatestGeneratedContentByType(
  supabase: any,
  venueId: string,
): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from("ai_generated_content")
    .select("id, content_type, generated_text, status, created_at")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  if (error || !data) return {};

  const latestByType: Record<string, any> = {};
  for (const row of data) {
    if (!latestByType[row.content_type]) {
      latestByType[row.content_type] = row;
    }
  }
  return latestByType;
}
