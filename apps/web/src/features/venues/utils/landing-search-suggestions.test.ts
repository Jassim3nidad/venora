import { describe, expect, it } from "vitest";
import {
  buildLandingSearchSuggestions,
  filterLandingSearchSuggestions,
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
    expect(filterLandingSearchSuggestions(["Wedding", "Corporate"], " ")).toEqual(
      ["Wedding", "Corporate"],
    );
  });
});
