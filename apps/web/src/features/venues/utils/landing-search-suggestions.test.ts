import { describe, expect, it } from "vitest";
import {
  buildLandingSearchSuggestions,
  filterLandingSearchSuggestions,
  mergeLandingSearchSuggestionSources,
} from "./landing-search-suggestions";

describe("landing search suggestions", () => {
  it("deduplicates and sorts location and event suggestions", () => {
    const result = buildLandingSearchSuggestions([
      {
        location: "Tagaytay, Cavite",
        eventTypes: ["Wedding", "Corporate"],
      },
      { location: "tagaytay, cavite", eventTypes: ["Wedding"] },
    ]);

    expect(result.locations).toEqual(["Tagaytay, Cavite"]);
    expect(result.eventTypes).toEqual(["Corporate", "Wedding"]);
  });

  it("filters suggestions case-insensitively", () => {
    expect(
      filterLandingSearchSuggestions(["Wedding", "Corporate"], "wed"),
    ).toEqual(["Wedding"]);
  });

  it("returns all suggestions for an empty query", () => {
    expect(
      filterLandingSearchSuggestions(["Wedding", "Corporate"], " "),
    ).toEqual(["Wedding", "Corporate"]);
  });

  it("includes non-featured live venues and replaces stale fallback identities", () => {
    const result = mergeLandingSearchSuggestionSources(
      [
        {
          id: "venue-1",
          location: "Updated City, Cavite",
          eventTypes: ["Wedding"],
        },
        {
          id: "new-live-venue",
          location: "New City, Laguna",
          eventTypes: ["Corporate"],
        },
      ],
      [
        {
          id: "venue-1",
          location: "Old City, Cavite",
          eventTypes: ["Wedding"],
        },
      ],
    );

    expect(result).toHaveLength(2);
    expect(result.map((venue) => venue.location)).toEqual([
      "Updated City, Cavite",
      "New City, Laguna",
    ]);
  });
});
