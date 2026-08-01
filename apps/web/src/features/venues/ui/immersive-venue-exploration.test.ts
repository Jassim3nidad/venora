import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  PublicVenueMedia,
  PublicVenueSpace,
} from "../application/public-venue-profile";
import { groupVenueMedia } from "./ImmersiveVenueGallery";
import {
  filterVenueSpaces,
  getSpaceEventFilters,
  shouldRenderVenueJourney,
} from "./VenueSpaceExplorer";

function space(
  key: string,
  eventTypes: string[],
  overrides: Partial<PublicVenueSpace> = {},
): PublicVenueSpace {
  return {
    key,
    slug: key,
    name: key === "garden" ? "Garden" : "Hall",
    setting: key === "garden" ? "Outdoor" : "Indoor",
    type: null,
    shortDescription: null,
    description: null,
    capacityMin: null,
    capacityMax: key === "garden" ? 120 : 180,
    capacityLayouts: [],
    amenities: [],
    eventTypes,
    accessibility: null,
    restrictions: null,
    operatingNotes: null,
    media: [],
    ...overrides,
  };
}

function media(
  id: string,
  overrides: Partial<PublicVenueMedia> = {},
): PublicVenueMedia {
  return {
    id,
    src: `/media/${id}.jpg`,
    mediaType: "image",
    altText: `${id} photo`,
    caption: null,
    transcript: null,
    featured: false,
    spaceKey: null,
    collectionTitle: null,
    ...overrides,
  };
}

describe("immersive venue exploration", () => {
  const spaces = [
    space("garden", ["Wedding", "Birthday"]),
    space("hall", ["Corporate", "Birthday"]),
  ];

  it("derives real event filters and filters only related spaces", () => {
    expect(getSpaceEventFilters(spaces)).toEqual([
      "Birthday",
      "Corporate",
      "Wedding",
    ]);
    expect(filterVenueSpaces(spaces, "Wedding").map((item) => item.key)).toEqual([
      "garden",
    ]);
    expect(filterVenueSpaces(spaces, null)).toEqual(spaces);
  });

  it("renders a venue journey only for at least two named spaces", () => {
    expect(shouldRenderVenueJourney(spaces)).toBe(true);
    expect(shouldRenderVenueJourney(spaces.slice(0, 1))).toBe(false);
  });

  it("groups published media by collection and space with a legacy fallback", () => {
    const groups = groupVenueMedia(
      [
        media("cover"),
        media("garden-1", { spaceKey: "garden" }),
        media("detail", { collectionTitle: "Architectural details" }),
      ],
      spaces,
    );

    expect(groups.map((group) => group.title)).toEqual([
      "Venue gallery",
      "Garden",
      "Architectural details",
    ]);
  });

  it("keeps the journey cautious and gallery controls accessible", () => {
    const explorerSource = readFileSync(
      new URL("./VenueSpaceExplorer.tsx", import.meta.url),
      "utf8",
    );
    const gallerySource = readFileSync(
      new URL("./ImmersiveVenueGallery.tsx", import.meta.url),
      "utf8",
    );

    expect(explorerSource).toContain("One possible way to experience the property");
    expect(explorerSource).not.toMatch(/\b(ceremony|reception|afterparty|exact time)\b/i);
    expect(gallerySource).toContain('aria-label="Previous gallery item"');
    expect(gallerySource).toContain('aria-label="Next gallery item"');
    expect(gallerySource).toContain('event.key === "ArrowLeft"');
    expect(gallerySource).toContain("onTouchStart");
  });
});
