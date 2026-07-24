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
  const liveVenueBySlug = new Map(
    liveVenues.filter((v) => v.slug).map((venue) => [venue.slug, venue]),
  );

  return fallbackVenues
    .slice(0, FEATURED_VENUE_COUNT)
    .map((fallbackVenue) =>
      (fallbackVenue.slug ? liveVenueBySlug.get(fallbackVenue.slug) : undefined) ?? fallbackVenue,
    );
}
