import type {
  ReviewAnalytics,
  ReviewFlagReason,
  ReviewForModeration,
  ReviewWithDetails,
} from "../types/review.types";
import { computeDimensionAverages } from "./dimension-averages";

type VenoraSupabase = any;

export const REVIEW_SELECT = `
  *,
  profiles!customer_id(full_name, avatar_url),
  review_photos(id, url, created_at)
`;

const REVIEW_SELECT_WITH_FLAGS = `
  *,
  profiles!customer_id(full_name, avatar_url),
  review_photos(id, url, created_at),
  review_flags(reason, created_at)
`;

const REVIEW_SELECT_FOR_MODERATION = `
  *,
  profiles!customer_id(full_name, avatar_url),
  review_photos(id, url, created_at),
  review_flags(reason, details, created_at, reporter_id),
  venues(name, slug)
`;

function normalizeReview(row: any): ReviewWithDetails {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    customerId: String(row.customer_id),
    venueId: String(row.venue_id),
    overallRating: Number(row.overall_rating) || 0,
    venueQuality: row.venue_quality ?? null,
    cleanliness: row.cleanliness ?? null,
    staffService: row.staff_service ?? null,
    facilities: row.facilities ?? null,
    accessibility: row.accessibility ?? null,
    valueForMoney: row.value_for_money ?? null,
    foodQuality: row.food_quality ?? null,
    ambience: row.ambience ?? null,
    comment: row.comment ?? null,
    ownerReply: row.owner_reply ?? null,
    ownerReplyAt: row.owner_reply_at ?? null,
    helpfulCount: Number(row.helpful_count) || 0,
    status: row.status,
    createdAt: row.created_at,
    profile: profile
      ? { fullName: profile.full_name, avatarUrl: profile.avatar_url ?? null }
      : null,
    photos: (row.review_photos ?? []).map((photo: any) => ({
      id: String(photo.id),
      url: photo.url,
      createdAt: photo.created_at,
    })),
  };
}

function topReasonOf(flags: { reason: string }[]): ReviewFlagReason | null {
  if (flags.length === 0) return null;
  const counts = new Map<string, number>();
  for (const flag of flags)
    counts.set(flag.reason, (counts.get(flag.reason) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return (top?.[0] as ReviewFlagReason) ?? null;
}

function normalizeReviewForModeration(row: any): ReviewForModeration {
  const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
  const flags: { reason: string }[] = row.review_flags ?? [];

  return {
    ...normalizeReview(row),
    venueName: venue?.name ?? "Unknown venue",
    venueSlug: venue?.slug ?? "",
    flagCount: flags.length,
    topFlagReason: topReasonOf(flags),
  };
}

export async function getPublishedVenueReviews(
  supabase: VenoraSupabase,
  venueId: string,
): Promise<ReviewWithDetails[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("venue_id", venueId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "[reviews] published venue reviews fetch failed:",
      error.message,
    );
    return [];
  }

  return (data ?? []).map(normalizeReview);
}

/**
 * Same query as getPublishedVenueReviews but returns the raw (snake_case)
 * Supabase rows, unmapped. ReviewsSection.tsx (the public venue page's
 * review list) consumes the raw shape directly rather than the normalized
 * ReviewWithDetails type, matching the pre-existing convention of that
 * component and its sample-data fallback.
 */
export async function getPublishedVenueReviewsRaw(
  supabase: VenoraSupabase,
  venueId: string,
): Promise<any[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("venue_id", venueId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "[reviews] published venue reviews (raw) fetch failed:",
      error.message,
    );
    return [];
  }

  return data ?? [];
}

export async function getOwnerReviewsForVenues(
  supabase: VenoraSupabase,
  venueIds: string[],
): Promise<ReviewForModeration[]> {
  if (venueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT_FOR_MODERATION)
    .in("venue_id", venueIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviews] owner reviews fetch failed:", error.message);
    return [];
  }

  return (data ?? []).map(normalizeReviewForModeration);
}

export async function getReviewsForModeration(
  supabase: VenoraSupabase,
  { onlyFlagged = true }: { onlyFlagged?: boolean } = {},
): Promise<ReviewForModeration[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT_FOR_MODERATION)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviews] moderation queue fetch failed:", error.message);
    return [];
  }

  const normalized: ReviewForModeration[] = (data ?? []).map(
    normalizeReviewForModeration,
  );
  const filtered = onlyFlagged
    ? normalized.filter((review) => review.flagCount > 0)
    : normalized;

  return filtered.sort(
    (a, b) => b.flagCount - a.flagCount || (a.createdAt < b.createdAt ? 1 : -1),
  );
}

export async function getReviewAnalytics(
  supabase: VenoraSupabase,
  venueIds: string[],
): Promise<ReviewAnalytics> {
  if (venueIds.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      flaggedCount: 0,
      helpfulVotesTotal: 0,
      ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating: rating as 1 | 2 | 3 | 4 | 5,
        count: 0,
      })),
      dimensionAverages: [],
      monthlyTrend: [],
    };
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT_WITH_FLAGS)
    .in("venue_id", venueIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[reviews] analytics fetch failed:", error.message);
    return {
      totalReviews: 0,
      averageRating: 0,
      flaggedCount: 0,
      helpfulVotesTotal: 0,
      ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating: rating as 1 | 2 | 3 | 4 | 5,
        count: 0,
      })),
      dimensionAverages: [],
      monthlyTrend: [],
    };
  }

  const rows = (data ?? []) as any[];
  const reviews = rows
    .map(normalizeReview)
    .filter((review) => review.status !== "removed");
  const flaggedCount = rows.filter(
    (row) => (row.review_flags ?? []).length > 0,
  ).length;
  const helpfulVotesTotal = reviews.reduce(
    (sum, review) => sum + review.helpfulCount,
    0,
  );
  const averageRating =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce((sum, review) => sum + review.overallRating, 0) /
            reviews.length
          ).toFixed(2),
        )
      : 0;

  const ratingDistribution = ([1, 2, 3, 4, 5] as const).map((rating) => ({
    rating,
    count: reviews.filter((review) => review.overallRating === rating).length,
  }));

  const trendMap = new Map<string, { count: number; ratingSum: number }>();
  for (const review of reviews) {
    const month = new Date(review.createdAt).toISOString().slice(0, 7); // YYYY-MM
    const bucket = trendMap.get(month) ?? { count: 0, ratingSum: 0 };
    bucket.count += 1;
    bucket.ratingSum += review.overallRating;
    trendMap.set(month, bucket);
  }
  const monthlyTrend = [...trendMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-6)
    .map(([month, bucket]) => ({
      month,
      count: bucket.count,
      averageRating: Number((bucket.ratingSum / bucket.count).toFixed(2)),
    }));

  return {
    totalReviews: reviews.length,
    averageRating,
    flaggedCount,
    helpfulVotesTotal,
    ratingDistribution,
    dimensionAverages: computeDimensionAverages(reviews),
    monthlyTrend,
  };
}
