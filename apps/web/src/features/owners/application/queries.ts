import { buildVenueImageUrl } from "@/src/features/venues/utils/venue-mappers";

type VenoraSupabase = any;

export type PublicOwnerProfile = {
  slug: string;
  name: string;
  organizationName: string;
  createdAt: string;
  isVerified: boolean;
  venueCount: number;
  completedBookingCount: number;
  avgRating: number;
  reviewCount: number;
  serviceArea: string | null;
  tagline: string | null;
  shortDescription: string | null;
  about: string | null;
  yearEstablished: number | null;
  logoPath: string | null;
  coverImagePath: string | null;
  city: string | null;
  province: string | null;
  countryCode: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  websiteUrl: string | null;
  verificationStatus: string | null;
};

export type PublicOwnerVenue = {
  slug: string;
  name: string;
  description: string | null;
  province: string;
  city: string;
  municipality: string | null;
  capacityMin: number | null;
  capacityMax: number;
  basePrice: number;
  priceUnit: string;
  avgRating: number;
  reviewCount: number;
  imageUrl: string;
};

export type PublicOwnerReview = {
  id: string;
  venueName: string;
  venueSlug: string;
  customerName: string;
  customerAvatarUrl: string | null;
  overallRating: number;
  comment: string | null;
  ownerReply: string | null;
  createdAt: string;
};

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function normalizeProfile(row: any): PublicOwnerProfile | null {
  if (!row?.slug || !row?.name) return null;

  const organizationName = String(row.name);
  const displayName = nullableString(row.display_name);

  return {
    slug: String(row.slug),
    name: displayName ?? organizationName,
    organizationName,
    createdAt: String(row.created_at),
    isVerified: Boolean(row.is_verified),
    venueCount: Number(row.venue_count) || 0,
    completedBookingCount: Number(row.completed_booking_count) || 0,
    avgRating: Number(row.avg_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    serviceArea: row.service_area ? String(row.service_area) : null,
    tagline: nullableString(row.tagline),
    shortDescription: nullableString(row.short_description),
    about: nullableString(row.about),
    yearEstablished:
      row.year_established == null || !Number.isFinite(Number(row.year_established))
        ? null
        : Number(row.year_established),
    logoPath: nullableString(row.logo_path),
    coverImagePath: nullableString(row.cover_image_path),
    city: nullableString(row.city),
    province: nullableString(row.province),
    countryCode: nullableString(row.country_code),
    publicEmail: nullableString(row.public_email),
    publicPhone: nullableString(row.public_phone),
    websiteUrl: nullableString(row.website_url),
    verificationStatus: nullableString(row.verification_status),
  };
}

function normalizeVenue(row: any): PublicOwnerVenue | null {
  if (!row?.slug || !row?.name) return null;

  return {
    slug: String(row.slug),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    province: String(row.province ?? ""),
    city: String(row.city ?? ""),
    municipality: row.municipality ? String(row.municipality) : null,
    capacityMin: row.capacity_min == null ? null : Number(row.capacity_min),
    capacityMax: Number(row.capacity_max) || 0,
    basePrice: Number(row.base_price) || 0,
    priceUnit: String(row.price_unit ?? "per_event"),
    avgRating: Number(row.avg_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    imageUrl: buildVenueImageUrl(row.featured_image_path, ""),
  };
}

function normalizeReview(row: any): PublicOwnerReview | null {
  if (!row?.review_id || !row?.venue_slug) return null;

  return {
    id: String(row.review_id),
    venueName: String(row.venue_name ?? "Venue"),
    venueSlug: String(row.venue_slug),
    customerName: String(row.customer_name ?? "Venora customer"),
    customerAvatarUrl: row.customer_avatar_url
      ? String(row.customer_avatar_url)
      : null,
    overallRating: Number(row.overall_rating) || 0,
    comment: row.comment ? String(row.comment) : null,
    ownerReply: row.owner_reply ? String(row.owner_reply) : null,
    createdAt: String(row.created_at),
  };
}

export async function getPublicOwnerProfile(
  supabase: VenoraSupabase,
  slug: string,
): Promise<PublicOwnerProfile | null> {
  const { data, error } = await supabase
    .rpc("get_public_owner_profile", { p_slug: slug })
    .maybeSingle();

  if (error) {
    console.error("[owners] public owner profile fetch failed:", error.message);
    return null;
  }

  return normalizeProfile(data);
}

export async function getPublicOwnerProfileByVenue(
  supabase: VenoraSupabase,
  venueSlug: string,
): Promise<PublicOwnerProfile | null> {
  const { data, error } = await supabase
    .rpc("get_public_owner_profile_by_venue", { p_venue_slug: venueSlug })
    .maybeSingle();

  if (error) {
    console.error(
      "[owners] public owner profile by venue fetch failed:",
      error.message,
    );
    return null;
  }

  return normalizeProfile(data);
}

export async function getPublicOwnerVenues(
  supabase: VenoraSupabase,
  slug: string,
): Promise<PublicOwnerVenue[]> {
  const { data, error } = await supabase.rpc("get_public_owner_venues", {
    p_slug: slug,
  });

  if (error) {
    console.error("[owners] public owner venues fetch failed:", error.message);
    return [];
  }

  return (data ?? [])
    .map(normalizeVenue)
    .filter((venue: PublicOwnerVenue | null): venue is PublicOwnerVenue =>
      Boolean(venue),
    );
}

export async function getPublicOwnerReviews(
  supabase: VenoraSupabase,
  slug: string,
  limit = 6,
): Promise<PublicOwnerReview[]> {
  const { data, error } = await supabase.rpc("get_public_owner_reviews", {
    p_slug: slug,
    p_limit: limit,
  });

  if (error) {
    console.error("[owners] public owner reviews fetch failed:", error.message);
    return [];
  }

  return (data ?? [])
    .map(normalizeReview)
    .filter((review: PublicOwnerReview | null): review is PublicOwnerReview =>
      Boolean(review),
    );
}
