import { describe, expect, it } from "vitest";
import {
  getOwnerReviewLabels,
  getOwnerTrustCardLabels,
  summarizeServiceAreas,
} from "./owner-profile-presentation";

describe("summarizeServiceAreas", () => {
  it("shows the first three unique areas and reports the remaining count", () => {
    expect(
      summarizeServiceAreas(
        "Alfonso, Cavite | Antipolo City, Rizal | Baguio City, Baguio | Alfonso, Cavite | Cebu City, Cebu",
      ),
    ).toEqual({
      visibleAreas: [
        "Alfonso, Cavite",
        "Antipolo City, Rizal",
        "Baguio City, Baguio",
      ],
      remainingCount: 1,
    });
  });

  it("handles empty and malformed separators without exposing blank labels", () => {
    expect(summarizeServiceAreas(" |  | ")).toEqual({
      visibleAreas: [],
      remainingCount: 0,
    });
    expect(summarizeServiceAreas(null)).toEqual({
      visibleAreas: [],
      remainingCount: 0,
    });
  });
});

describe("getOwnerReviewLabels", () => {
  it("uses meaningful copy when the owner has no public reviews", () => {
    expect(getOwnerReviewLabels(0, 0)).toEqual({
      rating: "Not rated yet",
      reviews: "No reviews yet",
    });
  });

  it("formats real review evidence without changing the values", () => {
    expect(getOwnerReviewLabels(12, 4.76)).toEqual({
      rating: "4.8 out of 5",
      reviews: "12 reviews",
    });
    expect(getOwnerReviewLabels(1, 5)).toEqual({
      rating: "5.0 out of 5",
      reviews: "1 review",
    });
  });
});

describe("getOwnerTrustCardLabels", () => {
  it("summarizes verified owners with venue and review evidence", () => {
    expect(
      getOwnerTrustCardLabels({
        isVerified: true,
        venueCount: 3,
        reviewCount: 12,
        avgRating: 4.76,
      }),
    ).toEqual({
      verification: "Verified venue owner",
      venues: "3 venues",
      reviews: "4.8 from 12 reviews",
    });
  });

  it("uses safe labels when public owner proof is limited", () => {
    expect(
      getOwnerTrustCardLabels({
        isVerified: false,
        venueCount: 1,
        reviewCount: 0,
        avgRating: 0,
      }),
    ).toEqual({
      verification: "Venora venue owner",
      venues: "1 venue",
      reviews: null,
    });
  });
});
