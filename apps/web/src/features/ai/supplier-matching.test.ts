import { describe, expect, it } from "vitest";
import type { SupplierMarketplaceProfile } from "../suppliers/types/supplier.types";
import { rankSupplierMatches } from "./supplier-matching";

function supplier(
  overrides: Partial<SupplierMarketplaceProfile>,
): SupplierMarketplaceProfile {
  return {
    id: "s1",
    profileId: "p1",
    businessName: "Accredited Catering",
    slug: "accredited-catering",
    category: { id: "c1", name: "Catering", slug: "catering" },
    headline: "Wedding catering in Manila",
    description: null,
    basePrice: 50_000,
    priceUnit: "per_event",
    serviceAreas: ["Manila"],
    coverageRadiusKm: null,
    contactEmail: null,
    contactPhone: null,
    websiteUrl: null,
    instagramUrl: null,
    profileImageUrl: null,
    heroImageUrl: null,
    businessLocationType: "mobile",
    locationVisibility: "service_area_only",
    latitude: null,
    longitude: null,
    city: "Manila",
    province: "Metro Manila",
    country: "Philippines",
    businessAddress: null,
    publicLocationLabel: "Metro Manila",
    travelAvailable: true,
    travelFeeNote: null,
    responseTimeHours: 4,
    yearsInBusiness: 5,
    teamSize: 8,
    minimumBookingNoticeDays: 14,
    isFeatured: false,
    accreditationStatus: "accredited",
    avgRating: 4.8,
    reviewCount: 20,
    createdAt: "2026-01-01T00:00:00.000Z",
    packages: [],
    portfolio: [],
    reviews: [],
    ...overrides,
  };
}

describe("supplier marketplace matching", () => {
  it("excludes non-accredited suppliers using the live profile contract", () => {
    const matches = rankSupplierMatches([
      supplier({ id: "accredited" }),
      supplier({
        id: "pending",
        businessName: "Pending Supplier",
        accreditationStatus: "pending",
      }),
    ]);

    expect(matches.map((match) => match.supplier.id)).toEqual(["accredited"]);
  });

  it("filters against marketplace category, location, budget, and rating", () => {
    const matches = rankSupplierMatches(
      [
        supplier({ id: "match" }),
        supplier({
          id: "outside-budget",
          basePrice: 150_000,
          businessName: "Premium Catering",
        }),
        supplier({
          id: "wrong-location",
          serviceAreas: ["Cebu"],
          city: "Cebu City",
          publicLocationLabel: "Cebu",
          businessName: "Cebu Catering",
        }),
      ],
      {
        categorySlug: "catering",
        location: "Manila",
        maxPrice: 75_000,
        minRating: 4.5,
      },
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.supplier.id).toBe("match");
    expect(matches[0]?.reasons).toContain("Within budget");
  });

  it("ranks relevant and trusted suppliers deterministically", () => {
    const matches = rankSupplierMatches(
      [
        supplier({
          id: "lower",
          businessName: "Lower Match",
          avgRating: 4.2,
          reviewCount: 2,
        }),
        supplier({
          id: "top",
          businessName: "Top Match",
          isFeatured: true,
          avgRating: 4.9,
          reviewCount: 50,
        }),
      ],
      { query: "wedding catering" },
    );

    expect(matches.map((match) => match.supplier.id)).toEqual(["top", "lower"]);
    expect(matches[0]!.score).toBeGreaterThan(matches[1]!.score);
  });
});
