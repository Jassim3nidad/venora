import { describe, expect, it } from "vitest";
import {
  capacityLayoutsSchema,
  createVenueSpaceSchema,
  isPackageVenueSpaceOwnershipValid,
  mediaItemSchema,
  packageVenueSpacesSchema,
  publishStructuredVenueProfileSchema,
  reorderVenueSpacesSchema,
  spaceAmenitiesSchema,
  spaceEventTypesSchema,
  updateVenueSpaceSchema,
  venueFaqSchema,
  venueLogisticsSchema,
  mediaCollectionSchema,
} from "./structured-venue.schema";

const venueId = "758c437f-6a9c-434a-a5aa-e6290787bd7f";
const revisionId = "df2ca83c-18a7-4f6d-b48f-3469ef3d37d1";
const spaceId = "8d191e6e-b5d9-46c7-bd31-a95b7fb5f32a";
const packageId = "1f6b693e-a6b6-4b7f-a9bd-5f45909e3db0";
const organizationId = "674f7be0-cb96-49da-96e1-2c526b53ba23";

const validSpace = {
  revisionId,
  venueId,
  name: "Grand Ballroom",
  slug: "grand-ballroom",
  spaceType: "ballroom",
  setting: "indoor",
  shortDescription: "A formal space for receptions.",
  description: "A flexible ballroom for seated or standing events.",
  capacityMin: 50,
  capacityMax: 300,
  accessibilitySummary: "Step-free entrance available.",
  restrictions: null,
  operatingNotes: null,
  displayOrder: 0,
};

describe("structured venue validation contracts", () => {
  it("accepts a valid space payload and trims plain text", () => {
    const parsed = createVenueSpaceSchema.safeParse({
      ...validSpace,
      name: "  Garden Pavilion  ",
      slug: "garden-pavilion",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Garden Pavilion");
    }
  });

  it("rejects invalid slugs, unsupported states, extra trusted fields, and bad capacities", () => {
    expect(
      createVenueSpaceSchema.safeParse({
        ...validSpace,
        slug: "Grand Ballroom",
      }).success,
    ).toBe(false);
    expect(
      createVenueSpaceSchema.safeParse({
        ...validSpace,
        setting: "both",
      }).success,
    ).toBe(false);
    expect(
      createVenueSpaceSchema.safeParse({
        ...validSpace,
        userId: "2c61c691-a935-49e5-b475-5ad6274ca625",
      }).success,
    ).toBe(false);
    expect(
      createVenueSpaceSchema.safeParse({
        ...validSpace,
        capacityMin: 301,
        capacityMax: 300,
      }).success,
    ).toBe(false);
    expect(
      createVenueSpaceSchema.safeParse({
        ...validSpace,
        capacityMax: 100001,
      }).success,
    ).toBe(false);
  });

  it("validates update and reorder commands without accepting caller roles", () => {
    expect(
      updateVenueSpaceSchema.safeParse({
        venueId,
        revisionId,
        spaceId,
        name: "Updated Ballroom",
      }).success,
    ).toBe(true);
    expect(
      updateVenueSpaceSchema.safeParse({
        venueId,
        revisionId,
        spaceId,
        role: "venue_owner",
      }).success,
    ).toBe(false);
    expect(
      reorderVenueSpacesSchema.safeParse({
        venueId,
        revisionId,
        orderedIds: [spaceId, spaceId],
      }).success,
    ).toBe(false);
  });

  it("validates capacity layouts and rejects custom layouts without labels", () => {
    expect(
      capacityLayoutsSchema.safeParse({
        venueId,
        revisionId,
        spaceId,
        spaceCapacityMax: 300,
        layouts: [
          {
            layout: "banquet",
            capacity: 220,
            displayOrder: 0,
          },
          {
            layout: "custom",
            customLayoutLabel: "Ceremony with aisle",
            capacity: 180,
            displayOrder: 1,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      capacityLayoutsSchema.safeParse({
        venueId,
        revisionId,
        spaceId,
        spaceCapacityMax: 300,
        layouts: [{ layout: "custom", capacity: 180, displayOrder: 0 }],
      }).success,
    ).toBe(false);
    expect(
      capacityLayoutsSchema.safeParse({
        venueId,
        revisionId,
        spaceId,
        spaceCapacityMax: 300,
        layouts: [{ layout: "banquet", capacity: 301, displayOrder: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate amenity and event-type relationships", () => {
    const amenityId = "1007e238-ab12-4d4c-9a01-9c2a41989a95";
    const eventTypeId = "49661f19-3a48-449c-a065-aae28c2ec596";

    expect(
      spaceAmenitiesSchema.safeParse({
        venueId,
        revisionId,
        spaceId,
        amenities: [
          { amenityId, notes: "Near the entrance." },
          { amenityId },
        ],
      }).success,
    ).toBe(false);
    expect(
      spaceEventTypesSchema.safeParse({
        venueId,
        revisionId,
        spaceId,
        eventTypes: [
          { eventTypeId, notes: "Works well for ceremonies." },
          { eventTypeId },
        ],
      }).success,
    ).toBe(false);
  });

  it("validates media collections and stored media path ownership", () => {
    expect(
      mediaCollectionSchema.safeParse({
        revisionId,
        venueId,
        collectionType: "space_gallery",
        spaceId,
        title: "Ballroom photos",
        description: "Latest event setup images.",
        displayOrder: 0,
        isCover: false,
      }).success,
    ).toBe(true);
    expect(
      mediaItemSchema.safeParse({
        collectionId: "4f0a9a5f-709d-471d-9586-15d211de8d24",
        venueId,
        spaceId,
        mediaType: "image",
        storagePath: `${organizationId}/${venueId}/ballroom.webp`,
        altText: "Grand ballroom with banquet seating",
        caption: "Banquet layout",
        displayOrder: 0,
        isFeatured: true,
      }).success,
    ).toBe(true);
    expect(
      mediaItemSchema.safeParse({
        collectionId: "4f0a9a5f-709d-471d-9586-15d211de8d24",
        venueId,
        mediaType: "image",
        storagePath: `${organizationId}/00000000-0000-4000-8000-000000000000/wrong.webp`,
        displayOrder: 0,
      }).success,
    ).toBe(false);
  });

  it("rejects unsafe external media because no provider allowlist exists yet", () => {
    expect(
      mediaItemSchema.safeParse({
        collectionId: "4f0a9a5f-709d-471d-9586-15d211de8d24",
        venueId,
        mediaType: "external_video",
        externalProvider: "youtube",
        externalUrl: "https://youtube.com/watch?v=venue",
        displayOrder: 0,
      }).success,
    ).toBe(false);
    expect(
      mediaItemSchema.safeParse({
        collectionId: "4f0a9a5f-709d-471d-9586-15d211de8d24",
        venueId,
        mediaType: "external_video",
        externalUrl: "<iframe src='https://example.com'></iframe>",
        displayOrder: 0,
      }).success,
    ).toBe(false);
  });

  it("validates logistics and FAQ plain-text limits", () => {
    expect(
      venueLogisticsSchema.safeParse({
        venueId,
        revisionId,
        parkingCapacity: 50,
        parkingNotes: "Street parking nearby.",
        weatherBackupAvailable: true,
        curfewTime: "22:30",
      }).success,
    ).toBe(true);
    expect(
      venueLogisticsSchema.safeParse({
        venueId,
        revisionId,
        parkingCapacity: -1,
      }).success,
    ).toBe(false);
    expect(
      venueFaqSchema.safeParse({
        venueId,
        revisionId,
        question: "Can we bring suppliers?",
        answer: "<script>alert('x')</script>",
        category: "suppliers",
        displayOrder: 0,
      }).success,
    ).toBe(false);
  });

  it("validates package-space commands and same-venue ownership hook inputs", () => {
    expect(
      packageVenueSpacesSchema.safeParse({
        venueId,
        packageId,
        spaces: [
          {
            spaceId,
            inclusionType: "included",
            inclusionNotes: "Main reception area.",
            displayOrder: 0,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      packageVenueSpacesSchema.safeParse({
        venueId,
        packageId,
        spaces: [
          { spaceId, inclusionType: "included", displayOrder: 0 },
          { spaceId, inclusionType: "upgrade", displayOrder: 1 },
        ],
      }).success,
    ).toBe(false);
    expect(
      isPackageVenueSpaceOwnershipValid({
        venueId,
        packageVenueId: venueId,
        spaceVenueId: venueId,
      }),
    ).toBe(true);
    expect(
      isPackageVenueSpaceOwnershipValid({
        venueId,
        packageVenueId: venueId,
        spaceVenueId: "00000000-0000-4000-8000-000000000000",
      }),
    ).toBe(false);
  });

  it("keeps publish input server-derived and strict", () => {
    expect(
      publishStructuredVenueProfileSchema.safeParse({
        venueId,
        revisionId,
      }).success,
    ).toBe(true);
    expect(
      publishStructuredVenueProfileSchema.safeParse({
        venueId,
        revisionId,
        organizationId,
        permission: "publish_assigned_venue_listings",
      }).success,
    ).toBe(false);
  });
});
