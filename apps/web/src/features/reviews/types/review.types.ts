import type { REVIEW_FLAG_REASONS } from "../schemas/review-flag.schema";

export type ReviewFlagReason = (typeof REVIEW_FLAG_REASONS)[number];

export type ReviewStatus = "published" | "flagged" | "removed";

export type ReviewPhoto = {
  id: string;
  url: string;
  storagePath?: string;
  createdAt: string;
};

export type ReviewAuthor = {
  fullName: string;
  avatarUrl: string | null;
};

export type ReviewWithDetails = {
  id: string;
  bookingId: string;
  customerId: string;
  venueId: string;
  overallRating: number;
  venueQuality?: number | null;
  cleanliness?: number | null;
  staffService?: number | null;
  facilities?: number | null;
  accessibility?: number | null;
  valueForMoney?: number | null;
  foodQuality?: number | null;
  ambience?: number | null;
  comment?: string | null;
  ownerReply?: string | null;
  ownerReplyAt?: string | null;
  helpfulCount: number;
  status: ReviewStatus;
  createdAt: string;
  profile?: ReviewAuthor | null;
  photos: ReviewPhoto[];
};

export type ReviewForModeration = ReviewWithDetails & {
  venueName: string;
  venueSlug: string;
  flagCount: number;
  topFlagReason: ReviewFlagReason | null;
};

export type ReviewDimensionAverage = {
  label: string;
  key:
    | "cleanliness"
    | "staffService"
    | "facilities"
    | "accessibility"
    | "valueForMoney"
    | "foodQuality"
    | "ambience"
    | "venueQuality";
  value: number;
};

export type ReviewRatingDistribution = {
  rating: 1 | 2 | 3 | 4 | 5;
  count: number;
};

export type ReviewAnalytics = {
  totalReviews: number;
  averageRating: number;
  flaggedCount: number;
  helpfulVotesTotal: number;
  ratingDistribution: ReviewRatingDistribution[];
  dimensionAverages: ReviewDimensionAverage[];
  monthlyTrend: { month: string; count: number; averageRating: number }[];
};
