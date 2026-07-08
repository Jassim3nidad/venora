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
}

function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const amount = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

// SupabaseClient generic typing can conflict with generated Database types
// We use any here since the query result is processed dynamically anyway.
export async function searchMarketplaceVenues(
  supabase: any,
  params: VenueSearchParams
) {
  let query = supabase
    .from("venues")
    .select(`
      *,
      venue_images(storage_path, is_featured, display_order),
      venue_category_assignments${params.venueTypes?.length ? '!inner' : ''}(venue_categories${params.venueTypes?.length ? '!inner' : ''}(name, slug)),
      venue_event_types${params.event ? '!inner' : ''}(event_types${params.event ? '!inner' : ''}(name, slug)),
      venue_amenities${params.amenities?.length ? '!inner' : ''}(amenities${params.amenities?.length ? '!inner' : ''}(name))
    `)
    .eq("status", "published");

  if (params.q) {
    // Sanitize to prevent PostgREST syntax errors (commas, quotes, parentheses break .or)
    const q = params.q.replace(/[,()"]/g, '').trim();
    if (q) {
      query = query.or(
        `name.ilike.%${q}%,city.ilike.%${q}%,province.ilike.%${q}%,municipality.ilike.%${q}%`
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
    const loc = params.location.replace(/[,()"]/g, '').trim();
    if (loc) {
      query = query.or(`location.ilike.%${loc}%,city.ilike.%${loc}%,municipality.ilike.%${loc}%,province.ilike.%${loc}%`);
    }
  }

  if (params.capacity) {
    const capacity = Number(params.capacity);
    if (!Number.isNaN(capacity) && capacity > 0) {
      query = query.gte("capacity_max", capacity);
    }
  }

  if (params.indoorOutdoor) {
    if (params.indoorOutdoor === "indoor" || params.indoorOutdoor === "outdoor") {
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
    query = query.ilike("venue_event_types.event_types.name", `%${params.event}%`);
  }

  if (params.venueTypes && params.venueTypes.length > 0) {
    const typesFilters = params.venueTypes
      .map(t => t.replace(/[,()"]/g, '').trim())
      .filter(Boolean)
      .map(safeT => `venue_category_assignments.venue_categories.name.ilike.%${safeT}%`)
      .join(',');
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
    if (norm.includes("park")) booleanAmenities.push({ col: "parking_available", val: true });
    else if (norm.includes("air")) booleanAmenities.push({ col: "air_conditioned", val: true });
    else if (norm.includes("pet")) booleanAmenities.push({ col: "pet_friendly", val: true });
    else if (norm.includes("wheelchair") || norm.includes("accessible")) booleanAmenities.push({ col: "wheelchair_accessible", val: true });
    else if (norm.includes("pool")) booleanAmenities.push({ col: "has_pool", val: true });
    else if (norm.includes("overnight") || norm.includes("accommodation")) booleanAmenities.push({ col: "overnight_accommodation", val: true });
    else textAmenities.push(am);
  }

  for (const { col, val } of booleanAmenities) {
    query = query.eq(col, val);
  }

  if (textAmenities.length > 0) {
    const amFilters = textAmenities
      .map(a => a.replace(/[,()"]/g, '').trim())
      .filter(Boolean)
      .map(safeA => `venue_amenities.amenities.name.ilike.%${safeA}%`)
      .join(',');
    if (amFilters) query = query.or(amFilters);
  }

  return query.order("created_at", { ascending: false });
}
