import { describe, expect, it } from "vitest";
import {
  PACKAGE_VENUE_SPACE_INCLUSION_TYPES,
  VENUE_FAQ_CATEGORIES,
  VENUE_MEDIA_COLLECTION_TYPES,
  VENUE_MEDIA_PROVIDER_VALUES,
  VENUE_SPACE_LAYOUTS,
  VENUE_SPACE_SETTINGS,
  VENUE_SPACE_TYPES,
  VENUE_STRUCTURED_CONTENT_STATUSES,
  VENUE_STRUCTURED_MEDIA_TYPES,
  getPackageVenueSpaceInclusionTypeLabel,
  getVenueFaqCategoryLabel,
  getVenueMediaCollectionTypeLabel,
  getVenueSpaceLayoutLabel,
  getVenueSpaceSettingLabel,
  getVenueSpaceTypeLabel,
  isPackageVenueSpaceInclusionType,
  isVenueFaqCategory,
  isVenueMediaCollectionType,
  isVenueMediaProvider,
  isVenueProfileRevisionStatus,
  isVenueSpaceLayout,
  isVenueSpaceSetting,
  isVenueSpaceType,
  isVenueStructuredContentStatus,
  isVenueStructuredMediaType,
} from "./structured-venue.types";

function expectUnique(values: readonly string[]) {
  expect(new Set(values).size).toBe(values.length);
}

describe("structured venue domain contracts", () => {
  it("defines the approved publication/content lifecycle values", () => {
    expect(VENUE_STRUCTURED_CONTENT_STATUSES).toEqual([
      "draft",
      "published",
      "archived",
    ]);
    expect(isVenueProfileRevisionStatus("published")).toBe(true);
    expect(isVenueStructuredContentStatus("review")).toBe(false);
    expect(isVenueStructuredContentStatus("pending")).toBe(false);
  });

  it("keeps controlled values unique and labelable", () => {
    [
      VENUE_SPACE_SETTINGS,
      VENUE_SPACE_TYPES,
      VENUE_SPACE_LAYOUTS,
      VENUE_MEDIA_COLLECTION_TYPES,
      VENUE_STRUCTURED_MEDIA_TYPES,
      VENUE_FAQ_CATEGORIES,
      PACKAGE_VENUE_SPACE_INCLUSION_TYPES,
    ].forEach(expectUnique);

    expect(getVenueSpaceSettingLabel("mixed")).toBe("Indoor and outdoor");
    expect(getVenueSpaceTypeLabel("preparation_suite")).toBe(
      "Preparation suite",
    );
    expect(getVenueSpaceLayoutLabel("u_shape")).toBe("U-shape");
    expect(getVenueMediaCollectionTypeLabel("space_gallery")).toBe(
      "Space gallery",
    );
    expect(getVenueFaqCategoryLabel("suppliers")).toBe("Suppliers");
    expect(getPackageVenueSpaceInclusionTypeLabel("upgrade")).toBe("Upgrade");
  });

  it("rejects unsupported controlled values", () => {
    expect(isVenueSpaceSetting("both")).toBe(false);
    expect(isVenueSpaceType("hotel")).toBe(false);
    expect(isVenueSpaceLayout("cabaret")).toBe(false);
    expect(isVenueMediaCollectionType("virtual_tour")).toBe(false);
    expect(isVenueStructuredMediaType("tour_360")).toBe(false);
    expect(isVenueFaqCategory("internal")).toBe(false);
    expect(isPackageVenueSpaceInclusionType("discount")).toBe(false);
  });

  it("preserves the current uploaded-video-only provider scope", () => {
    expect(VENUE_MEDIA_PROVIDER_VALUES).toEqual([]);
    expect(isVenueMediaProvider("youtube")).toBe(false);
    expect(isVenueMediaProvider("vimeo")).toBe(false);
  });

  it("exposes runtime guards for all reusable value groups", () => {
    expect(isVenueSpaceSetting("indoor")).toBe(true);
    expect(isVenueSpaceType("garden")).toBe(true);
    expect(isVenueSpaceLayout("custom")).toBe(true);
    expect(isVenueMediaCollectionType("gallery")).toBe(true);
    expect(isVenueStructuredMediaType("external_video")).toBe(true);
    expect(isVenueFaqCategory("policies")).toBe(true);
    expect(isPackageVenueSpaceInclusionType("included")).toBe(true);
  });
});
