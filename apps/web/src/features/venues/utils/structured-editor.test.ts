import { describe, expect, it } from "vitest";
import type { DraftStructuredVenueProfile } from "../domain/structured-venue.types";
import {
  getPublishBlockingIssues,
  getStructuredProfileDisplayStatus,
  getStructuredSectionStatuses,
} from "./structured-editor";

const baseProfile: DraftStructuredVenueProfile = {
  revision: {
    id: "df2ca83c-18a7-4f6d-b48f-3469ef3d37d1",
    venueId: "758c437f-6a9c-434a-a5aa-e6290787bd7f",
    status: "draft",
    revisionNumber: 1,
    createdFromRevisionId: null,
    publishedAt: null,
    publishedBy: null,
    archivedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  spaces: [],
  mediaCollections: [],
  mediaItems: [],
  logistics: null,
  faqs: [],
  packageSpaces: [],
};

describe("structured editor readiness helpers", () => {
  it("marks a missing draft as not ready without implying failure for optional media", () => {
    const statuses = getStructuredSectionStatuses(null, 2);

    expect(statuses.overview).toBe("incomplete");
    expect(statuses.spaces).toBe("incomplete");
    expect(statuses.media).toBe("optional");
    expect(statuses.preview).toBe("needs_attention");
  });

  it("requires one valid space and logistics before publishing", () => {
    const profile: DraftStructuredVenueProfile = {
      ...baseProfile,
      spaces: [
        {
          id: "8d191e6e-b5d9-46c7-bd31-a95b7fb5f32a",
          revisionId: baseProfile.revision.id,
          venueId: baseProfile.revision.venueId,
          spaceKey: "d57d96e1-0c8f-4c28-9b05-a6bcf40b1da3",
          name: "Garden Pavilion",
          slug: "garden-pavilion",
          spaceType: "garden",
          setting: "outdoor",
          shortDescription: null,
          description: null,
          capacityMin: 50,
          capacityMax: 150,
          accessibilitySummary: null,
          restrictions: null,
          operatingNotes: null,
          displayOrder: 0,
          status: "draft",
          archivedAt: null,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      logistics: {
        id: "e54a1c40-9e55-4514-bd72-8825918ddc34",
        revisionId: baseProfile.revision.id,
        venueId: baseProfile.revision.venueId,
        parkingCapacity: 40,
        parkingNotes: "Street and paid parking nearby.",
        accessibilityNotes: null,
        arrivalNotes: null,
        publicTransportationNotes: null,
        weatherBackupAvailable: true,
        weatherBackupNotes: "Covered reception area available.",
        curfewTime: null,
        noiseRestrictions: null,
        setupRules: null,
        teardownRules: null,
        externalSupplierRules: null,
        petPolicy: null,
        smokingPolicy: null,
        otherNotes: null,
        status: "draft",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    };

    expect(getStructuredSectionStatuses(profile, 1).preview).toBe("complete");
    expect(getPublishBlockingIssues(profile)).toEqual([]);
  });

  it("uses truthful draft and publication status labels", () => {
    expect(getStructuredProfileDisplayStatus(null, null)).toBe("Not started");
    expect(getStructuredProfileDisplayStatus(null, "2026-08-01")).toBe(
      "Published",
    );
    expect(getStructuredProfileDisplayStatus(baseProfile, null)).toBe("Draft");
    expect(getStructuredProfileDisplayStatus(baseProfile, "2026-08-01")).toBe(
      "Unpublished changes",
    );
  });
});
