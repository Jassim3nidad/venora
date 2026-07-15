import { describe, expect, it } from "vitest";
import type { Venue } from "../utils/venue-mappers";
import {
  getFeaturedVenueIds,
  resolveFeaturedMarketplaceVenues,
} from "./featured-venues";

const fallbackVenue = {
  id: "venue-1",
  slug: "research-slug",
  name: "Research Venue",
} as Venue;

describe("resolveFeaturedMarketplaceVenues", () => {
  it("requests the exact research identities used by featured cards", () => {
    const fallbackVenues = ["1", "2", "3", "4"].map(
      (id) => ({ id, slug: `research-${id}`, name: `Research ${id}` }) as Venue,
    );

    expect(getFeaturedVenueIds(fallbackVenues)).toEqual(["1", "2", "3"]);
  });

  it("prefers a published live venue identity over research fallback", () => {
    const result = resolveFeaturedMarketplaceVenues(
      [{ id: "venue-1", slug: "live-slug", name: "Live Venue" } as Venue],
      [fallbackVenue],
    );

    expect(result[0]).toMatchObject({
      name: "Live Venue",
      slug: "live-slug",
    });
  });

  it("uses research data when a live row is missing", () => {
    expect(resolveFeaturedMarketplaceVenues([], [fallbackVenue])).toEqual([
      fallbackVenue,
    ]);
  });

  it("returns the first three research identities in research order", () => {
    const fallbackVenues = ["1", "2", "3", "4"].map(
      (id) => ({ id, slug: `research-${id}`, name: `Research ${id}` }) as Venue,
    );
    const liveVenues = [
      { id: "3", slug: "live-3", name: "Live 3" } as Venue,
      { id: "1", slug: "live-1", name: "Live 1" } as Venue,
    ];

    expect(
      resolveFeaturedMarketplaceVenues(liveVenues, fallbackVenues).map(
        (venue) => venue.slug,
      ),
    ).toEqual(["live-1", "research-2", "live-3"]);
  });
});
