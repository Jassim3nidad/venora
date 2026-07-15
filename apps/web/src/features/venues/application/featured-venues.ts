import type { Venue } from "../utils/venue-mappers";

const FEATURED_VENUE_COUNT = 3;

export function getFeaturedVenueIds(fallbackVenues: Venue[]) {
  return fallbackVenues
    .slice(0, FEATURED_VENUE_COUNT)
    .map((venue) => String(venue.id));
}

export function resolveFeaturedMarketplaceVenues(
  liveVenues: Venue[],
  fallbackVenues: Venue[],
) {
  const liveVenueById = new Map(
    liveVenues.map((venue) => [String(venue.id), venue]),
  );

  return fallbackVenues
    .slice(0, FEATURED_VENUE_COUNT)
    .map((fallbackVenue) =>
      liveVenueById.get(String(fallbackVenue.id)) ?? fallbackVenue,
    );
}
