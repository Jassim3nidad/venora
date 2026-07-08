import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { createClient } from "@/lib/supabase/server";
import VenuesClient from "@/src/features/venues/ui/VenuesClient";
import {
  researchVenues,
  toMarketplaceVenue,
  type ResearchVenue,
} from "@/src/features/venues/data/research-venues";
import { searchMarketplaceVenues, type VenueSearchParams } from "@/src/features/venues/application/queries";

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

function formatCurrency(value?: number | null) {
  if (!value || !Number.isFinite(Number(value))) return "Price on request";
  return `\u20b1${Number(value).toLocaleString("en-PH")}`;
}

function buildVenueImageUrl(storagePath?: string | null, fallback = "") {
  if (!storagePath) return fallback;
  if (storagePath.startsWith("http")) return storagePath;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return fallback;

  return `${supabaseUrl}/storage/v1/object/public/venue-images/${storagePath}`;
}

function relationNames(rows: any[] | null | undefined, relationName: string) {
  return (rows ?? [])
    .map((row) => row?.[relationName]?.name)
    .filter((name): name is string => Boolean(name));
}

function firstVenueImage(venue: any) {
  return [...(venue.venue_images ?? [])].sort((a: any, b: any) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  })[0];
}

function toLiveMarketplaceVenue(
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
    eventTypes: eventTypes.length > 0 ? eventTypes : (fallbackVenue?.eventTypes ?? []),
    categories: categories.length > 0 ? categories : (fallbackVenue?.categories ?? []),
    amenities: amenities.length > 0 ? amenities : (fallbackVenue?.amenities ?? []),
    isFavorited: favoriteVenueIds.has(String(venue.id)),
  };
}

export default async function VenuesMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const filters: VenueSearchParams = {
    q: params.q as string | undefined,
    province: params.province as string | undefined,
    city: params.city as string | undefined,
    municipality: params.municipality as string | undefined,
    location: params.location as string | undefined,
    event: params.event as string | undefined,
    budget: params.budget as string | undefined,
    minBudget: params.minBudget as string | undefined,
    maxBudget: params.maxBudget as string | undefined,
    capacity: params.capacity as string | undefined,
    indoorOutdoor: params.indoorOutdoor as string | undefined,
  };

  if (params.venueTypes) {
    filters.venueTypes = String(params.venueTypes).split(',');
  }

  if (params.amenities) {
    filters.amenities = String(params.amenities).split(',');
  }

  const { data: dbVenues, error } = await searchMarketplaceVenues(supabase, filters);

  if (error) {
    console.error("[venues/page] Supabase fetch error:", error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let favoriteVenueIds = new Set<string>();
  let profile: { full_name: string | null; avatar_url: string | null } | null =
    null;

  if (user) {
    const { data: favoriteRows, error: favoritesError } = await (
      supabase.from("favorites") as any
    )
      .select("venue_id")
      .eq("customer_id", user.id);

    if (favoritesError) {
      console.error(
        "[venues/page] Favorites fetch error:",
        favoritesError.message,
      );
    } else {
      favoriteVenueIds = new Set(
        (favoriteRows ?? []).map((row: any) => String(row.venue_id)),
      );
    }

    const { data: profileRow } = await (supabase.from("profiles") as any)
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    profile = profileRow ?? null;
  }

  const researchVenueById = new Map(
    researchVenues.map((venue) => [venue.id, venue]),
  );
  const dbRows = error ? [] : ((dbVenues ?? []) as any[]);
  const dbIds = new Set(dbRows.map((venue) => String(venue.id)));
  const livePublishedVenues = dbRows
    .filter((venue) => venue.status === "published")
    .map((venue) =>
      toLiveMarketplaceVenue(
        venue,
        favoriteVenueIds,
        researchVenueById.get(String(venue.id)),
      ),
    );

  const fallbackVenues = researchVenues
    .filter((venue) => !dbIds.has(venue.id))
    .map((venue) => toMarketplaceVenue(venue, favoriteVenueIds));

  const venues: Venue[] =
    dbRows.length > 0
      ? [...livePublishedVenues, ...fallbackVenues]
      : researchVenues.map((venue) => toMarketplaceVenue(venue, favoriteVenueIds));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F9FAFB] text-[#111827]">
      <CustomerNavbar user={user} profile={profile} />

      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <VenuesClient
          initialVenues={venues}
          favoriteVenueIds={[...favoriteVenueIds]}
        />
      </div>
    </div>
  );
}
