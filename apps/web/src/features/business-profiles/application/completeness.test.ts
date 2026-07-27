import { describe, expect, it } from "vitest";
import { calculateProfileCompleteness } from "./completeness";
import type { BusinessProfileDraft } from "../types/business-profile.types";

function baseDraft(overrides: Partial<BusinessProfileDraft> = {}) {
  return {
    id: "profile-1",
    organization_id: "org-1",
    slug: "sais-eventplace",
    display_name: "Sai's Eventplace",
    legal_name: "Sai's Eventplace",
    tagline: "The best venue in town",
    primary_category: "venue_owner",
    year_established: 2025,
    logo_path: "https://example.com/logo.png",
    cover_image_path: "https://example.com/cover.jpg",
    short_description: "A trusted Cavite venue owner.",
    about: "We manage reliable spaces for events.",
    city: "Amadeo",
    province: "Cavite",
    country_code: "PH",
    private_address: null,
    address_visibility: "city_province",
    public_email: "hello@example.com",
    email_visibility: true,
    public_phone: null,
    phone_visibility: false,
    website_url: null,
    publication_status: "draft",
    verification_status: "unverified",
    current_publication_id: null,
    published_at: null,
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: "2026-07-22T00:00:00.000Z",
    venues: [],
    portfolio: [],
    team: [],
    social_links: [],
    policies: [],
    published_venues: [],
    ...overrides,
  } as unknown as BusinessProfileDraft;
}

describe("calculateProfileCompleteness", () => {
  it("allows publishing when the organization has published venues", () => {
    const result = calculateProfileCompleteness(
      baseDraft({
        venues: [],
        published_venues: [
          { id: "venue-1", name: "Main Hall", slug: "main-hall" },
        ],
      }),
    );

    expect(result.isEligibleForPublish).toBe(true);
    expect(result.missingItems).not.toContain("At least one eligible venue");
  });
});
