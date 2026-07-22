export type ServiceAreaSummary = {
  visibleAreas: string[];
  remainingCount: number;
};

export function summarizeServiceAreas(
  value: string | null | undefined,
  maxVisible = 3,
): ServiceAreaSummary {
  const uniqueAreas: string[] = [];
  const seen = new Set<string>();

  for (const area of value?.split("|") ?? []) {
    const normalizedArea = area.trim();
    const comparisonKey = normalizedArea.toLocaleLowerCase("en-PH");

    if (!normalizedArea || seen.has(comparisonKey)) continue;

    seen.add(comparisonKey);
    uniqueAreas.push(normalizedArea);
  }

  const visibleLimit = Math.max(0, Math.floor(maxVisible));

  return {
    visibleAreas: uniqueAreas.slice(0, visibleLimit),
    remainingCount: Math.max(0, uniqueAreas.length - visibleLimit),
  };
}

export function getOwnerReviewLabels(reviewCount: number, avgRating: number) {
  if (reviewCount <= 0) {
    return {
      rating: "New on Venora",
      reviews: "No customer reviews yet",
    };
  }

  return {
    rating: `${avgRating.toFixed(1)} out of 5`,
    reviews: `${reviewCount.toLocaleString("en-PH")} ${reviewCount === 1 ? "review" : "reviews"}`,
  };
}

export function getOwnerTrustCardLabels({
  isVerified,
  venueCount,
  reviewCount,
  avgRating,
}: {
  isVerified: boolean;
  venueCount: number;
  reviewCount: number;
  avgRating: number;
}) {
  return {
    verification: isVerified ? "Verified venue owner" : "Venora venue owner",
    venues: `${venueCount.toLocaleString("en-PH")} ${venueCount === 1 ? "venue" : "venues"}`,
    reviews:
      reviewCount > 0
        ? `${avgRating.toFixed(1)} from ${reviewCount.toLocaleString("en-PH")} ${reviewCount === 1 ? "review" : "reviews"}`
        : null,
  };
}
