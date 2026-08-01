import { describe, expect, it } from "vitest";
import type {
  DraftStructuredVenueProfile,
  PublishedStructuredVenueProfile,
} from "../domain/structured-venue.types";
import { buildPublicVenueProfile } from "./public-venue-profile";

const venue = {
  id: "venue-1",
  slug: "garden-house",
  name: "Garden House",
  description: "A real venue description.",
  address: "1 Venue Road",
  city: "Tagaytay",
  province: "Cavite",
  capacity_min: 20,
  capacity_max: 120,
  indoor_outdoor: "both",
  base_price: 100000,
  price_unit: "per_event",
  parking_available: true,
  wheelchair_accessible: false,
  venue_amenities: [{ amenities: { name: "Wi-Fi" } }],
  venue_images: [
    {
      id: "legacy-image",
      storage_path: "/legacy.jpg",
      media_type: "image",
      alt_text: "Garden House exterior",
      display_order: 0,
      is_featured: true,
    },
  ],
  venue_packages: [
    {
      id: "package-1",
      name: "Venue package",
      description: "Venue use only.",
      price: 100000,
      price_unit: "per_event",
      min_guests: 20,
      max_guests: 120,
      inclusions: ["Venue use"],
      is_active: true,
    },
  ],
};

const revision = {
  id: "revision-1",
  venueId: venue.id,
  status: "published" as const,
  revisionNumber: 1,
  createdFromRevisionId: null,
  publishedAt: "2026-08-01T00:00:00.000Z",
  publishedBy: "owner-1",
  archivedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const structuredProfile: PublishedStructuredVenueProfile = {
  revision,
  spaces: [
    {
      id: "space-1",
      revisionId: revision.id,
      venueId: venue.id,
      spaceKey: "space-key-1",
      name: "Garden Pavilion",
      slug: "garden-pavilion",
      spaceType: "garden",
      setting: "outdoor",
      shortDescription: "An open garden pavilion.",
      description: "Published space description.",
      capacityMin: 30,
      capacityMax: 100,
      accessibilitySummary: null,
      restrictions: null,
      operatingNotes: null,
      displayOrder: 0,
      status: "published",
      createdAt: revision.createdAt,
      updatedAt: revision.updatedAt,
      archivedAt: null,
    },
  ],
  mediaCollections: [
    {
      id: "collection-1",
      revisionId: revision.id,
      venueId: venue.id,
      spaceId: null,
      collectionType: "hero",
      title: "Venue arrival",
      description: null,
      displayOrder: 0,
      isCover: true,
      status: "published",
      createdAt: revision.createdAt,
      updatedAt: revision.updatedAt,
    },
  ],
  mediaItems: [
    {
      id: "structured-image",
      collectionId: "collection-1",
      venueId: venue.id,
      spaceId: null,
      storagePath: "/structured.jpg",
      legacyVenueImageId: null,
      mediaType: "image",
      externalUrl: null,
      externalProvider: null,
      altText: "Garden House at sunset",
      caption: "Arrival lawn",
      transcript: null,
      displayOrder: 0,
      isFeatured: true,
      status: "published",
      createdAt: revision.createdAt,
      updatedAt: revision.updatedAt,
      deletedAt: null,
    },
  ],
  logistics: null,
  faqs: [],
  packageSpaces: [
    {
      id: "link-1",
      packageId: "package-1",
      spaceId: "space-1",
      venueId: venue.id,
      inclusionType: "included",
      inclusionNotes: null,
      displayOrder: 0,
      createdAt: revision.createdAt,
      updatedAt: revision.updatedAt,
    },
  ],
};

describe("public venue profile view model", () => {
  it("keeps legacy venues fully usable without a structured revision", () => {
    const profile = buildPublicVenueProfile({ venue });

    expect(profile.source).toBe("legacy");
    expect(profile.hero.image?.id).toBe("legacy-image");
    expect(profile.packages).toHaveLength(1);
    expect(profile.spaces).toEqual([]);
    expect(profile.sections).not.toContain("spaces");
  });

  it("uses published structured content without exposing revision fields", () => {
    const profile = buildPublicVenueProfile({
      venue,
      structuredProfile,
      spaceRelations: {
        capacityLayouts: [
          {
            id: "layout-1",
            spaceId: "space-1",
            layout: "banquet",
            customLayoutLabel: null,
            capacity: 80,
            notes: null,
            displayOrder: 0,
            createdAt: revision.createdAt,
            updatedAt: revision.updatedAt,
          },
        ],
        amenities: [{ spaceId: "space-1", name: "Stage" }],
        eventTypes: [{ spaceId: "space-1", name: "Wedding" }],
      },
    });

    expect(profile.source).toBe("structured");
    expect(profile.hero.image?.id).toBe("structured-image");
    expect(profile.spaces[0]).toMatchObject({
      name: "Garden Pavilion",
      eventTypes: ["Wedding"],
      amenities: ["Stage"],
      capacityLayouts: [{ label: "Banquet", capacity: 80, notes: null }],
    });
    expect(profile.packages[0]?.includedSpaces[0]?.name).toBe("Garden Pavilion");
    expect(JSON.stringify(profile)).not.toContain("revision-1");
    expect(JSON.stringify(profile)).not.toContain("publishedBy");
  });

  it("does not reveal a draft-only profile on the public route", () => {
    const draft = {
      ...structuredProfile,
      revision: { ...revision, status: "draft" },
      spaces: structuredProfile.spaces.map((space) => ({
        ...space,
        status: "draft",
      })),
      mediaCollections: structuredProfile.mediaCollections.map((collection) => ({
        ...collection,
        status: "draft",
      })),
      mediaItems: structuredProfile.mediaItems.map((item) => ({
        ...item,
        status: "draft",
      })),
    } as DraftStructuredVenueProfile;

    const profile = buildPublicVenueProfile({
      venue,
      structuredProfile: draft,
      mode: "public",
    });

    expect(profile.spaces).toEqual([]);
    expect(profile.hero.image?.id).toBe("legacy-image");
    expect(JSON.stringify(profile)).not.toContain("revision-1");
    expect(JSON.stringify(profile)).not.toContain("draft");
  });

  it("omits archived optional content and preserves safe preview distinction", () => {
    const archived = {
      ...structuredProfile,
      spaces: structuredProfile.spaces.map((space) => ({
        ...space,
        status: "archived",
      })),
    } as unknown as PublishedStructuredVenueProfile;

    const publicProfile = buildPublicVenueProfile({
      venue,
      structuredProfile: archived,
    });
    const previewProfile = buildPublicVenueProfile({
      venue,
      structuredProfile,
      mode: "preview",
    });

    expect(publicProfile.spaces).toEqual([]);
    expect(previewProfile.mode).toBe("preview");
    expect(previewProfile.spaces).toHaveLength(1);
  });

  it("uses review rows and safe owner fields without private plan data", () => {
    const profile = buildPublicVenueProfile({
      venue,
      reviews: [{ overall_rating: 5 }],
      ownerProfile: {
        slug: "garden-house-company",
        name: "Garden House Company",
        organizationName: "Garden House Company",
        createdAt: revision.createdAt,
        isVerified: true,
        venueCount: 2,
        completedBookingCount: 5,
        avgRating: 5,
        reviewCount: 1,
        serviceArea: null,
        tagline: null,
        shortDescription: null,
        about: null,
        yearEstablished: null,
        logoPath: null,
        coverImagePath: null,
        city: null,
        province: null,
        countryCode: null,
        publicEmail: null,
        publicPhone: null,
        websiteUrl: null,
        verificationStatus: null,
      },
    });

    expect(profile.rating).toEqual({ average: 5, count: 1 });
    expect(profile.owner).toMatchObject({
      slug: "garden-house-company",
      name: "Garden House Company",
      verified: true,
    });
    const serialized = JSON.stringify(profile);
    expect(serialized).not.toContain("customerId");
    expect(serialized).not.toContain("preferredCity");
    expect(serialized).not.toContain("expectedGuestCount");
  });
});
