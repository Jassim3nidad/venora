import { describe, expect, it } from "vitest";
import { normalizeProfile } from "./queries";

describe("normalizeProfile", () => {
  it("maps published business profile fields onto the public owner profile", () => {
    const profile = normalizeProfile({
      slug: "venora-research-venue-network",
      name: "Venora Research Venue Network",
      created_at: "2026-01-15T00:00:00.000Z",
      is_verified: true,
      venue_count: 11,
      completed_booking_count: 4,
      avg_rating: 4.75,
      review_count: 8,
      service_area: "General Trias, Cavite",
      display_name: "Sai's Eventplace",
      tagline: "Reliable spaces for milestone celebrations.",
      short_description: "A trusted venue group in Cavite.",
      about:
        "We manage event venues for weddings, debuts, and corporate gatherings.",
      year_established: 2025,
      logo_path: "https://example.com/logo.png",
      cover_image_path: "https://example.com/cover.jpg",
      city: "General Trias",
      province: "Cavite",
      country_code: "PH",
      public_email: "hello@example.com",
      public_phone: "+63 917 000 0000",
      website_url: "https://example.com",
      verification_status: "verified",
    });

    expect(profile).toMatchObject({
      slug: "venora-research-venue-network",
      name: "Sai's Eventplace",
      organizationName: "Venora Research Venue Network",
      tagline: "Reliable spaces for milestone celebrations.",
      shortDescription: "A trusted venue group in Cavite.",
      about:
        "We manage event venues for weddings, debuts, and corporate gatherings.",
      yearEstablished: 2025,
      logoPath: "https://example.com/logo.png",
      coverImagePath: "https://example.com/cover.jpg",
      city: "General Trias",
      province: "Cavite",
      countryCode: "PH",
      publicEmail: "hello@example.com",
      publicPhone: "+63 917 000 0000",
      websiteUrl: "https://example.com",
      verificationStatus: "verified",
    });
  });

  it("falls back to organization data when no publication fields exist", () => {
    const profile = normalizeProfile({
      slug: "venora-research-venue-network",
      name: "Venora Research Venue Network",
      created_at: "2026-01-15T00:00:00.000Z",
      is_verified: false,
      venue_count: 0,
      completed_booking_count: 0,
      avg_rating: 0,
      review_count: 0,
      service_area: null,
    });

    expect(profile).toMatchObject({
      name: "Venora Research Venue Network",
      organizationName: "Venora Research Venue Network",
      tagline: null,
      publicEmail: null,
      publicPhone: null,
    });
  });
});
