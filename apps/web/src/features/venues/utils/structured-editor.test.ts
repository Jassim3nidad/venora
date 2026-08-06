import { describe, expect, it } from "vitest";
import type { DraftStructuredVenueProfile } from "../domain/structured-venue.types";
import {
  getProfileSectionStatuses,
  getPublishBlockingIssues,
  getStructuredProfileDisplayStatus,
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
  id: "1",
  venueId: "758c437f-6a9c-434a-a5aa-e6290787bd7f",
  spaces: [],
  mediaCollections: [],
  mediaItems: [],
  logistics: null,
  faqs: [],
  packageSpaces: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("structured profile engine", () => {
  it("starts empty", () => {
    const statuses = getProfileSectionStatuses(null);
    const issues = getPublishBlockingIssues(null);

    expect(statuses.overview.completionState).toBe("not_started");
    expect(statuses.spaces.completionState).toBe("not_started");
    expect(statuses.media.completionState).toBe("not_started");
    expect(statuses.review.completionState).toBe("blocked");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("requires one valid space and logistics before publishing", () => {
    const profile: DraftStructuredVenueProfile = {
      ...baseProfile,
      spaces: [],
      logistics: null,
    };

    const s1 = getProfileSectionStatuses(profile);
    expect(s1.spaces.completionState).toBe("not_started");
    expect(s1.review.completionState).toBe("blocked");

    profile.spaces = [
      {
        id: "s1",
        revisionId: profile.revision.id,
        venueId: profile.revision.venueId,
        spaceKey: "spaceKey1",
        name: "Grand Hall",
        slug: "grand-hall",
        capacityMax: 100,
        capacityMin: 10,
        spaceType: "ballroom",
        setting: "indoor",
        shortDescription: null,
        description: null,
        accessibilitySummary: null,
        restrictions: null,
        operatingNotes: null,
        displayOrder: 0,
        status: "draft",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        archivedAt: null,
      },
    ];

    const s2 = getProfileSectionStatuses(profile);
    expect(s2.spaces.completionState).toBe("complete");
    expect(s2.review.completionState).toBe("blocked"); // Still needs logistics

    profile.logistics = {
      id: "l1",
      revisionId: profile.revision.id,
      venueId: profile.revision.venueId,
      parkingCapacity: 50,
      parkingNotes: null,
      accessibilityNotes: null,
      arrivalNotes: null,
      publicTransportationNotes: null,
      weatherBackupAvailable: false,
      weatherBackupNotes: null,
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
    };

    const s3 = getProfileSectionStatuses(profile);
    expect(s3.logistics.completionState).toBe("complete");
    expect(s3.review.completionState).toBe("needs_attention"); // Ready but not published
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
