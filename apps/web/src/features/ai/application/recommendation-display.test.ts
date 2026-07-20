import { describe, expect, it } from "vitest";
import { selectRecommendationDisplayVenues } from "./recommendation-display";

const fallbackVenue = {
  id: "fallback-venue",
  name: "Fallback Venue",
  slug: "fallback-venue",
  city: "Tagaytay",
  province: "Cavite",
  municipality: "Tagaytay",
  basePrice: 100000,
  capacityMin: 50,
  capacityMax: 200,
  indoorOutdoor: "both",
  parkingAvailable: true,
  petFriendly: false,
  wheelchairAccessible: true,
  avgRating: 4.8,
  similarity: null,
  relevanceScore: null,
  categories: ["Garden"],
  amenities: ["Parking"],
  eventTypes: ["Wedding"],
  image: null,
};

describe("selectRecommendationDisplayVenues", () => {
  it("uses AI venues when available", () => {
    const aiVenue = { ...fallbackVenue, id: "ai-venue", name: "AI Venue" };

    expect(
      selectRecommendationDisplayVenues({
        aiVenues: [aiVenue],
        fallbackVenues: [fallbackVenue],
      }),
    ).toEqual({ venues: [aiVenue], isFallback: false });
  });

  it("uses fallback venues when AI returns empty", () => {
    expect(
      selectRecommendationDisplayVenues({
        aiVenues: [],
        fallbackVenues: [fallbackVenue],
      }),
    ).toEqual({ venues: [fallbackVenue], isFallback: true });
  });
});
