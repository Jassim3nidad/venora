import {
  toMarketplaceVenue,
  type ResearchVenue,
} from "@/src/features/venues/data/research-venues";

export interface Venue {
  id: string | number;
  slug?: string;
  name: string;
  location: string;
  price: string;
  capacity: string;
  image: string;
  rating?: number;
  category?: string;
  city?: string;
  municipality?: string;
  province?: string;
  basePrice?: number;
  budgetRange?: string;
  capacityMin?: number | null;
  capacityMax?: number;
  latitude?: number | null;
  longitude?: number | null;
  indoorOutdoor?: string | null;
  airConditioned?: boolean;
  parkingAvailable?: boolean;
  overnightAccommodation?: boolean;
  petFriendly?: boolean;
  wheelchairAccessible?: boolean;
  hasPool?: boolean;
  ceremonyVenue?: boolean;
  receptionVenue?: boolean;
  eventTypes?: string[];
  categories?: string[];
  amenities?: string[];
  isFavorited?: boolean;
}

export function formatCurrency(value?: number | null) {
  if (!value || !Number.isFinite(Number(value))) return "Price on request";
  return `\u20b1${Number(value).toLocaleString("en-PH")}`;
}

export function buildVenueImageUrl(storagePath?: string | null, fallback = "") {
  if (!storagePath) return fallback;
  if (storagePath.startsWith("http")) return storagePath;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return fallback;

  return `${supabaseUrl}/storage/v1/object/public/venue-images/${storagePath}`;
}

export function relationNames(
  rows: any[] | null | undefined,
  relationName: string,
) {
  return (rows ?? [])
    .map((row) => row?.[relationName]?.name)
    .filter((name): name is string => Boolean(name));
}

export function mergeAmenityNames(
  predefined: Array<string | null | undefined> = [],
  custom: Array<string | null | undefined> = [],
) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const name of [...predefined, ...custom]) {
    const trimmed = String(name ?? "").trim();
    if (!trimmed) continue;

    const key = trimmed.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(trimmed);
  }

  return merged;
}

export function firstVenueImage(venue: any) {
  return [...(venue.venue_images ?? [])]
    .filter((item: any) => item.media_type !== "video")
    .sort((a: any, b: any) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    })[0];
}

export function applyReviewSummariesToVenues(venues: any[], reviews: any[]) {
  const summaryByVenue = new Map<string, { count: number; total: number }>();

  for (const review of reviews) {
    const venueId = String(review.venue_id ?? "");
    const rating = Number(review.overall_rating ?? 0);
    if (!venueId || !Number.isFinite(rating) || rating <= 0) continue;

    const summary = summaryByVenue.get(venueId) ?? { count: 0, total: 0 };
    summary.count += 1;
    summary.total += rating;
    summaryByVenue.set(venueId, summary);
  }

  return venues.map((venue) => {
    const summary = summaryByVenue.get(String(venue.id));
    if (!summary) return venue;

    return {
      ...venue,
      avg_rating: summary.total / summary.count,
      review_count: summary.count,
    };
  });
}

export function toLiveMarketplaceVenue(
  venue: any,
  favoriteVenueIds: Set<string>,
  fallback?: ResearchVenue,
): Venue {
  const fallbackVenue = fallback
    ? toMarketplaceVenue(fallback, favoriteVenueIds)
    : null;
  const categories = relationNames(
    venue.venue_category_assignments,
    "venue_categories",
  );
  const eventTypes = relationNames(venue.venue_event_types, "event_types");
  const amenities = relationNames(venue.venue_amenities, "amenities");
  const mergedAmenities = mergeAmenityNames(
    amenities,
    venue.custom_amenities,
  );
  const image = buildVenueImageUrl(
    firstVenueImage(venue)?.storage_path,
    fallbackVenue?.image ?? "",
  );

  return {
    ...(fallbackVenue ?? {}),
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    location: [venue.city, venue.province].filter(Boolean).join(", "),
    price: formatCurrency(venue.base_price),
    capacity: `Up to ${Number(venue.capacity_max).toLocaleString("en-PH")} pax`,
    image,
    rating: Number(venue.avg_rating) || fallbackVenue?.rating || 0,
    category: categories[0] ?? fallbackVenue?.category ?? "Venue",
    city: venue.city,
    municipality: venue.municipality ?? venue.city,
    province: venue.province,
    basePrice: Number(venue.base_price) || 0,
    budgetRange: fallbackVenue?.budgetRange ?? "",
    capacityMin: venue.capacity_min ?? null,
    capacityMax: venue.capacity_max,
    latitude: venue.latitude ?? null,
    longitude: venue.longitude ?? null,
    indoorOutdoor: venue.indoor_outdoor,
    airConditioned: Boolean(venue.air_conditioned),
    parkingAvailable: Boolean(venue.parking_available),
    overnightAccommodation: Boolean(venue.overnight_accommodation),
    petFriendly: Boolean(venue.pet_friendly),
    wheelchairAccessible: Boolean(venue.wheelchair_accessible),
    hasPool: Boolean(venue.has_pool),
    ceremonyVenue: Boolean(venue.ceremony_venue),
    receptionVenue: Boolean(venue.reception_venue),
    eventTypes:
      eventTypes.length > 0 ? eventTypes : (fallbackVenue?.eventTypes ?? []),
    categories:
      categories.length > 0 ? categories : (fallbackVenue?.categories ?? []),
    amenities:
      mergedAmenities.length > 0
        ? mergedAmenities
        : (fallbackVenue?.amenities ?? []),
    isFavorited: favoriteVenueIds.has(String(venue.id)),
  };
}
