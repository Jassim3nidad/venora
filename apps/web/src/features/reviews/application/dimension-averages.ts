import type {
  ReviewDimensionAverage,
  ReviewWithDetails,
} from "../types/review.types";

/**
 * Shared by ReviewsSection.tsx (public venue page) and the venue-owner
 * review analytics page so both compute averages identically.
 */
export function computeDimensionAverage(
  values: Array<number | null | undefined>,
): number {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (valid.length === 0) return 0;
  return Number(
    (valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1),
  );
}

export const REVIEW_DIMENSION_FIELDS = [
  "cleanliness",
  "staffService",
  "facilities",
  "accessibility",
  "valueForMoney",
  "foodQuality",
  "ambience",
  "venueQuality",
] as const satisfies readonly (keyof ReviewWithDetails)[];

export const REVIEW_DIMENSION_LABELS: Record<
  (typeof REVIEW_DIMENSION_FIELDS)[number],
  string
> = {
  cleanliness: "Cleanliness",
  staffService: "Staff Service",
  facilities: "Facilities",
  accessibility: "Accessibility",
  valueForMoney: "Value for Money",
  foodQuality: "Food Quality",
  ambience: "Ambience",
  venueQuality: "Venue Quality",
};

export function computeDimensionAverages(
  reviews: ReviewWithDetails[],
): ReviewDimensionAverage[] {
  return REVIEW_DIMENSION_FIELDS.map((key) => ({
    key,
    label: REVIEW_DIMENSION_LABELS[key],
    value: computeDimensionAverage(
      reviews.map((review) => review[key] as number | null | undefined),
    ),
  }));
}
