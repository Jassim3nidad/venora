import venuesJson from "@/data/venues.json";

type StringMap = Record<string, unknown>;

export interface ResearchVenue {
  id: string;
  name: string;
  slug: string;
  category: string;
  event_types_supported: string[];
  short_description: string;
  full_description: string;
  location: {
    province: string;
    city: string;
    address: string;
    postal_code?: string | null;
    coordinates?: {
      latitude?: number | null;
      longitude?: number | null;
    } | null;
    google_maps_url?: string | null;
  };
  contact: {
    official_website?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    email?: string | null;
    phone?: string | null;
    business_hours?: string | null;
  };
  capacity: {
    minimum_guests?: number | null;
    maximum_guests: number;
    indoor_outdoor: string;
    number_of_function_rooms?: number | null;
  };
  features: StringMap;
  pricing: {
    currency: string;
    starting_price_estimate: number;
    pricing_note?: string | null;
    typical_wedding_package_price_estimate?: number | null;
    corporate_event_price_estimate?: number | null;
    reservation_fee_estimate?: number | null;
    security_deposit_estimate?: number | null;
    payment_terms?: string | null;
    cancellation_policy?: string | null;
    peak_season_pricing_note?: string | null;
    off_season_pricing_note?: string | null;
  };
  packages: Array<{
    id: string;
    name: string;
    price_php: number;
    price_note?: string | null;
    max_guests?: number | null;
    inclusions: string[];
    optional_addons?: string[];
  }>;
  amenities: string[];
  photos: {
    note?: string | null;
    cover_photo_source?: string | null;
    gallery_sources?: string[];
    cover_image_url?: string | null;
    image_urls?: string[];
  };
  reviews?: Array<{
    is_seed_data?: boolean;
  }>;
  ai_tags: string[];
  search_filters: {
    budget_range?: string | null;
    guest_capacity_range?: string | null;
    venue_type?: string | null;
    indoor?: boolean;
    outdoor?: boolean;
    garden?: boolean;
    beach?: boolean;
    hotel?: boolean;
    restaurant?: boolean;
    resort?: boolean;
    function_hall?: boolean;
    pet_friendly?: boolean;
    parking?: boolean;
    accommodation?: boolean;
    church_ceremony?: boolean;
    reception?: boolean;
  };
  data_verification?: StringMap;
}

export interface DatasetVenueMedia {
  id: string;
  storage_path: string;
  media_type: "image";
  alt_text: string;
  display_order: number;
  is_featured: boolean;
}

export interface DatasetVenuePackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: "per_event";
  min_guests: number | null;
  max_guests: number | null;
  inclusions: string[];
  is_active?: boolean;
}

export interface MarketplaceVenue {
  id: string;
  slug: string;
  name: string;
  location: string;
  price: string;
  capacity: string;
  image: string;
  rating?: number;
  category: string;
  city: string;
  municipality: string;
  province: string;
  basePrice: number;
  budgetRange: string;
  capacityMin: number | null;
  capacityMax: number;
  latitude: number | null;
  longitude: number | null;
  indoorOutdoor: string;
  airConditioned: boolean;
  parkingAvailable: boolean;
  overnightAccommodation: boolean;
  petFriendly: boolean;
  wheelchairAccessible: boolean;
  hasPool: boolean;
  ceremonyVenue: boolean;
  receptionVenue: boolean;
  eventTypes: string[];
  categories: string[];
  amenities: string[];
  isFavorited?: boolean;
}

export const researchVenues = venuesJson as ResearchVenue[];

export const researchVenueCount = researchVenues.length;

export const researchVenueImageCount = researchVenues.reduce(
  (total, venue) => total + (venue.photos.image_urls?.length ?? 0),
  0,
);

function toBoolean(value: unknown) {
  return value === true;
}

function toIndoorOutdoor(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "both") return "both";
  if (normalized === "outdoor") return "outdoor";
  return "indoor";
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Price on request";
  return `\u20b1${value.toLocaleString("en-PH")}`;
}

function unique(values: Array<string | null | undefined>) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

export function getResearchVenueBySlug(slug: string) {
  return researchVenues.find((venue) => venue.slug === slug) ?? null;
}

export function getResearchVenueMedia(
  venue: ResearchVenue,
): DatasetVenueMedia[] {
  return (venue.photos.image_urls ?? []).map((url, index) => ({
    id: `${venue.id}-image-${index + 1}`,
    storage_path: url,
    media_type: "image",
    alt_text: `${venue.name} photo ${index + 1}`,
    display_order: index,
    is_featured: index === 0,
  }));
}

export function getResearchVenuePackages(
  venue: ResearchVenue,
): DatasetVenuePackage[] {
  return venue.packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.price_note ?? null,
    price: pkg.price_php,
    price_unit: "per_event",
    min_guests: venue.capacity.minimum_guests ?? null,
    max_guests: pkg.max_guests ?? venue.capacity.maximum_guests,
    inclusions: [...pkg.inclusions, ...(pkg.optional_addons ?? [])],
    is_active: true,
  }));
}

export function getResearchVenueCategories(venue: ResearchVenue) {
  const filters = venue.search_filters;
  const categoryHints = [
    filters.garden ? "Garden" : undefined,
    filters.beach ? "Beach" : undefined,
    filters.resort ? "Resort" : undefined,
    filters.hotel ? "Hotel" : undefined,
    filters.restaurant ? "Restaurant" : undefined,
    filters.function_hall ? "Function Hall" : undefined,
    filters.church_ceremony ? "Church" : undefined,
  ];

  return unique([venue.category, filters.venue_type, ...categoryHints]);
}

export function toMarketplaceVenue(
  venue: ResearchVenue,
  favoriteVenueIds = new Set<string>(),
): MarketplaceVenue {
  const coordinates = venue.location.coordinates;
  const basePrice = venue.pricing.starting_price_estimate;
  const categories = getResearchVenueCategories(venue);
  const indoorOutdoor = toIndoorOutdoor(venue.capacity.indoor_outdoor);

  return {
    id: venue.id,
    slug: venue.slug,
    isFavorited: favoriteVenueIds.has(venue.id),
    name: venue.name,
    location: `${venue.location.city}, ${venue.location.province}`,
    price: formatCurrency(basePrice),
    capacity: `Up to ${venue.capacity.maximum_guests} pax`,
    image: venue.photos.cover_image_url ?? venue.photos.image_urls?.[0] ?? "",
    category: venue.category,
    city: venue.location.city,
    municipality: venue.location.city,
    province: venue.location.province,
    basePrice,
    budgetRange: venue.search_filters.budget_range ?? "",
    capacityMin: venue.capacity.minimum_guests ?? null,
    capacityMax: venue.capacity.maximum_guests,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    indoorOutdoor,
    airConditioned: toBoolean(venue.features.air_conditioned),
    parkingAvailable: Boolean(venue.search_filters.parking),
    overnightAccommodation: Boolean(venue.search_filters.accommodation),
    petFriendly: Boolean(venue.search_filters.pet_friendly),
    wheelchairAccessible: venue.features.wheelchair_accessible === true,
    hasPool: toBoolean(venue.features.swimming_pool),
    ceremonyVenue: Boolean(venue.search_filters.church_ceremony),
    receptionVenue: Boolean(venue.search_filters.reception),
    eventTypes: venue.event_types_supported,
    categories,
    amenities: venue.amenities,
  };
}

export function getMarketplaceResearchVenues(
  favoriteVenueIds = new Set<string>(),
) {
  return researchVenues.map((venue) =>
    toMarketplaceVenue(venue, favoriteVenueIds),
  );
}

export function toVenueDetailRecord(venue: ResearchVenue) {
  const coordinates = venue.location.coordinates;
  const categories = getResearchVenueCategories(venue);
  const images = getResearchVenueMedia(venue);

  return {
    id: venue.id,
    organization_id: "80000000-0000-0000-0000-000000000001",
    name: venue.name,
    slug: venue.slug,
    description: venue.full_description,
    ai_generated_description: null,
    province: venue.location.province,
    city: venue.location.city,
    municipality: venue.location.city,
    address: venue.location.address,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    capacity_min: venue.capacity.minimum_guests ?? null,
    capacity_max: venue.capacity.maximum_guests,
    base_price: venue.pricing.starting_price_estimate,
    price_unit: "per_event",
    indoor_outdoor: toIndoorOutdoor(venue.capacity.indoor_outdoor),
    air_conditioned: toBoolean(venue.features.air_conditioned),
    parking_available: Boolean(venue.search_filters.parking),
    overnight_accommodation: Boolean(venue.search_filters.accommodation),
    pet_friendly: Boolean(venue.search_filters.pet_friendly),
    wheelchair_accessible: venue.features.wheelchair_accessible === true,
    has_pool: toBoolean(venue.features.swimming_pool),
    ceremony_venue: Boolean(venue.search_filters.church_ceremony),
    reception_venue: Boolean(venue.search_filters.reception),
    operating_hours: null,
    cancellation_policy: venue.pricing.cancellation_policy ?? null,
    venue_rules: [
      venue.pricing.payment_terms,
      venue.pricing.peak_season_pricing_note,
      venue.pricing.off_season_pricing_note,
    ]
      .filter(Boolean)
      .join(" "),
    status: "published",
    is_featured: images.length > 0,
    featured_until: null,
    avg_rating: 0,
    review_count: 0,
    created_at: null,
    updated_at: null,
    venue_images: images,
    venue_packages: getResearchVenuePackages(venue),
    venue_amenities: venue.amenities.map((name) => ({ amenities: { name } })),
    venue_category_assignments: categories.map((name) => ({
      venue_categories: { name, slug: name.toLowerCase().replace(/\s+/g, "-") },
    })),
    venue_event_types: venue.event_types_supported.map((name) => ({
      event_types: { name, slug: name.toLowerCase().replace(/\s+/g, "-") },
    })),
    organizations: { name: venue.name },
    photos: venue.photos,
    contact: venue.contact,
    ai_tags: venue.ai_tags,
    search_filters: venue.search_filters,
  };
}

export function getResearchVenueDetailBySlug(slug: string) {
  const venue = getResearchVenueBySlug(slug);
  return venue ? toVenueDetailRecord(venue) : null;
}

export function getNearbyResearchVenueDetails(venue: ResearchVenue, limit = 3) {
  return researchVenues
    .filter(
      (candidate) =>
        candidate.id !== venue.id &&
        candidate.location.province === venue.location.province,
    )
    .slice(0, limit)
    .map(toVenueDetailRecord);
}

export function getFallbackResearchVenueRecommendations(
  currentVenue: ResearchVenue | null,
  limit = 4,
) {
  return researchVenues
    .filter((candidate) => candidate.id !== currentVenue?.id)
    .map((candidate) => {
      const sameProvince =
        currentVenue &&
        candidate.location.province === currentVenue.location.province;
      const sameCategory =
        currentVenue && candidate.category === currentVenue.category;

      return {
        venue: candidate,
        score: Number(sameProvince) * 3 + Number(sameCategory) * 2,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (
        b.venue.pricing.starting_price_estimate -
        a.venue.pricing.starting_price_estimate
      );
    })
    .slice(0, limit)
    .map(({ venue }) => ({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      city: venue.location.city,
      province: venue.location.province,
      municipality: venue.location.city,
      basePrice: venue.pricing.starting_price_estimate,
      capacityMin: venue.capacity.minimum_guests ?? null,
      capacityMax: venue.capacity.maximum_guests,
      indoorOutdoor: toIndoorOutdoor(venue.capacity.indoor_outdoor),
      parkingAvailable: Boolean(venue.search_filters.parking),
      petFriendly: Boolean(venue.search_filters.pet_friendly),
      wheelchairAccessible: venue.features.wheelchair_accessible === true,
      avgRating: 0,
      similarity: null,
      relevanceScore: null,
      categories: getResearchVenueCategories(venue),
      amenities: venue.amenities,
      eventTypes: venue.event_types_supported,
      image: venue.photos.cover_image_url ?? venue.photos.image_urls?.[0] ?? null,
    }));
}

export function getPublicResearchReviews() {
  return [];
}
