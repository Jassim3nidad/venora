import type {
  DraftStructuredVenueProfile,
  VenueLogistics,
} from "../domain/structured-venue.types";

export type StructuredEditorSectionId =
  | "overview"
  | "spaces"
  | "media"
  | "logistics"
  | "faqs"
  | "packages"
  | "preview";

export type StructuredEditorSectionStatus =
  | "complete"
  | "incomplete"
  | "optional"
  | "needs_attention";

export type StructuredEditorSection = {
  id: StructuredEditorSectionId;
  label: string;
  description: string;
};

export const STRUCTURED_EDITOR_SECTIONS: StructuredEditorSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Draft status and profile readiness.",
  },
  {
    id: "spaces",
    label: "Spaces",
    description: "Rooms, gardens, pavilions, and guest capacities.",
  },
  {
    id: "media",
    label: "Media",
    description: "Grouped venue and space galleries.",
  },
  {
    id: "logistics",
    label: "Logistics",
    description: "Parking, access, arrival, and policy details.",
  },
  {
    id: "faqs",
    label: "FAQs",
    description: "Plain-text customer questions and answers.",
  },
  {
    id: "packages",
    label: "Packages",
    description: "Connect existing packages to spaces.",
  },
  {
    id: "preview",
    label: "Preview and Publish",
    description: "Review private draft content before publication.",
  },
];

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function logisticsHasPublicValue(logistics: VenueLogistics | null) {
  if (!logistics) return false;

  return [
    logistics.parkingCapacity,
    logistics.parkingNotes,
    logistics.accessibilityNotes,
    logistics.arrivalNotes,
    logistics.publicTransportationNotes,
    logistics.weatherBackupNotes,
    logistics.curfewTime,
    logistics.noiseRestrictions,
    logistics.setupRules,
    logistics.teardownRules,
    logistics.externalSupplierRules,
    logistics.petPolicy,
    logistics.smokingPolicy,
    logistics.otherNotes,
  ].some((value) =>
    typeof value === "number" ? value > 0 : hasText(value ?? null),
  );
}

export function getStructuredSectionStatuses(
  profile: DraftStructuredVenueProfile | null,
  packageCount = 0,
): Record<StructuredEditorSectionId, StructuredEditorSectionStatus> {
  if (!profile) {
    return {
      overview: "incomplete",
      spaces: "incomplete",
      media: "optional",
      logistics: "incomplete",
      faqs: "optional",
      packages: "optional",
      preview: "needs_attention",
    };
  }

  const activeSpaces = profile.spaces.filter(
    (space) => space.status !== "archived",
  );
  const hasValidSpace = activeSpaces.some(
    (space) => hasText(space.name) && hasText(space.slug) && space.capacityMax > 0,
  );
  const hasMedia = profile.mediaItems.some(
    (item) => item.status !== "archived" && !item.deletedAt,
  );
  const hasFaqs = profile.faqs.some((faq) => faq.status !== "archived");
  const hasPackageLinks = profile.packageSpaces.length > 0;
  const hasLogistics = logisticsHasPublicValue(profile.logistics);

  return {
    overview: "complete",
    spaces: hasValidSpace ? "complete" : "incomplete",
    media: hasMedia ? "complete" : "optional",
    logistics: hasLogistics ? "complete" : "incomplete",
    faqs: hasFaqs ? "complete" : "optional",
    packages:
      packageCount === 0 ? "optional" : hasPackageLinks ? "complete" : "optional",
    preview: hasValidSpace && hasLogistics ? "complete" : "needs_attention",
  };
}

export function getPublishBlockingIssues(
  profile: DraftStructuredVenueProfile | null,
) {
  if (!profile) return ["Create a structured profile draft first."];

  const issues: string[] = [];
  const activeSpaces = profile.spaces.filter(
    (space) => space.status !== "archived",
  );

  if (activeSpaces.length === 0) {
    issues.push("Add at least one venue space.");
  }

  if (
    !activeSpaces.some(
      (space) =>
        hasText(space.name) && hasText(space.slug) && space.capacityMax > 0,
    )
  ) {
    issues.push("Complete one space with a name, slug, and capacity.");
  }

  if (!logisticsHasPublicValue(profile.logistics)) {
    issues.push("Add practical logistics information for customers.");
  }

  return issues;
}

export function getStructuredProfileDisplayStatus(
  profile: DraftStructuredVenueProfile | null,
  publishedAt?: string | null,
) {
  if (!profile && !publishedAt) return "Not started";
  if (!profile && publishedAt) return "Published";
  if (profile && !publishedAt) return "Draft";
  return "Unpublished changes";
}
