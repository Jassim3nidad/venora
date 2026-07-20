import type { SmartVenueSearchVenue } from "@/features/search/schemas/search.schema";

export function selectRecommendationDisplayVenues({
  aiVenues,
  fallbackVenues,
}: {
  aiVenues?: SmartVenueSearchVenue[] | null;
  fallbackVenues?: SmartVenueSearchVenue[] | null;
}): { venues: SmartVenueSearchVenue[]; isFallback: boolean } {
  if (aiVenues && aiVenues.length > 0) {
    return { venues: aiVenues, isFallback: false };
  }

  return { venues: fallbackVenues ?? [], isFallback: true };
}
