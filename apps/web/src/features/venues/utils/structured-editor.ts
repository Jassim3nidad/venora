import type {
  DraftStructuredVenueProfile,
  VenueLogistics,
} from "../domain/structured-venue.types";

export type ProfileSectionId =
  | "overview"
  | "spaces"
  | "media"
  | "logistics"
  | "faqs"
  | "packages"
  | "review";

export type CompletionState =
  | "complete"
  | "in_progress"
  | "not_started"
  | "needs_attention"
  | "blocked";

export type RequirementLevel = "required" | "recommended" | "optional";

export interface ProfileIssue {
  id: string;
  sectionId: ProfileSectionId;
  severity: "required" | "recommended";
  title: string;
  description: string;
  actionLabel: string;
  target: {
    sectionId: ProfileSectionId;
    entityId?: string;
    field?: string;
  };
}

export interface ProfileSectionStatus {
  id: ProfileSectionId;
  label: string;
  completionState: CompletionState;
  requirementLevel: RequirementLevel;
  completedItems: number;
  totalItems: number;
  summary: string;
  issues: ProfileIssue[];
}

export type StructuredEditorSection = {
  id: ProfileSectionId;
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
    id: "review",
    label: "Review and publish",
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

export function getProfileSectionStatuses(
  profile: DraftStructuredVenueProfile | null,
  packageCount = 0,
): Record<ProfileSectionId, ProfileSectionStatus> {
  const defaultStatus = (
    id: ProfileSectionId,
    label: string,
    requirementLevel: RequirementLevel,
    completionState: CompletionState = "not_started",
    summary = "",
  ): ProfileSectionStatus => ({
    id,
    label,
    completionState,
    requirementLevel,
    completedItems: 0,
    totalItems: 0,
    summary,
    issues: [],
  });

  if (!profile) {
    return {
      overview: defaultStatus("overview", "Overview", "required", "not_started", "Not started"),
      spaces: defaultStatus("spaces", "Spaces", "required", "not_started", "Not started"),
      media: defaultStatus("media", "Media", "recommended", "not_started", "Not started"),
      logistics: defaultStatus("logistics", "Logistics", "required", "not_started", "Not started"),
      faqs: defaultStatus("faqs", "FAQs", "optional", "not_started", "Not started"),
      packages: defaultStatus("packages", "Packages", "optional", "not_started", "Not started"),
      review: defaultStatus("review", "Review and publish", "required", "blocked", "Blocked"),
    };
  }

  const activeSpaces = profile.spaces.filter((space) => space.status !== "archived");
  const validSpaces = activeSpaces.filter((space) => hasText(space.name) && hasText(space.slug) && space.capacityMax > 0);
  
  const hasValidSpace = validSpaces.length > 0;
  
  const hasMedia = profile.mediaItems.some((item) => item.status !== "archived" && !item.deletedAt);
  const activeFaqs = profile.faqs.filter((faq) => faq.status !== "archived");
  
  const hasPackageLinks = profile.packageSpaces.length > 0;
  const hasLogistics = logisticsHasPublicValue(profile.logistics);

  const spacesIssues: ProfileIssue[] = [];
  if (activeSpaces.length === 0) {
    spacesIssues.push({
      id: "no-spaces",
      sectionId: "spaces",
      severity: "required",
      title: "Add at least one venue space",
      description: "Customers need to know what spaces they can book.",
      actionLabel: "Add space",
      target: { sectionId: "spaces" }
    });
  } else if (!hasValidSpace) {
    spacesIssues.push({
      id: "invalid-spaces",
      sectionId: "spaces",
      severity: "required",
      title: "Complete space details",
      description: "One or more spaces are missing a name, slug, or capacity.",
      actionLabel: "Edit spaces",
      target: { sectionId: "spaces" }
    });
  }

  const logisticsIssues: ProfileIssue[] = [];
  if (!hasLogistics) {
    logisticsIssues.push({
      id: "no-logistics",
      sectionId: "logistics",
      severity: "required",
      title: "Add logistics information",
      description: "Practical information for customers is missing.",
      actionLabel: "Add logistics",
      target: { sectionId: "logistics" }
    });
  }

  const mediaIssues: ProfileIssue[] = [];
  if (!hasMedia) {
    mediaIssues.push({
      id: "no-media",
      sectionId: "media",
      severity: "recommended",
      title: "Add venue photos",
      description: "Listings with photos receive significantly more inquiries.",
      actionLabel: "Add media",
      target: { sectionId: "media" }
    });
  }

  const allRequiredIssues = [...spacesIssues, ...logisticsIssues].filter(i => i.severity === "required");
  const allRecommendedIssues = [...mediaIssues].filter(i => i.severity === "recommended");
  const allIssues = [...allRequiredIssues, ...allRecommendedIssues];

  return {
    overview: {
      id: "overview",
      label: "Overview",
      completionState: "complete",
      requirementLevel: "required",
      completedItems: 1,
      totalItems: 1,
      summary: "Complete",
      issues: [],
    },
    spaces: {
      id: "spaces",
      label: "Spaces",
      completionState: hasValidSpace ? "complete" : activeSpaces.length > 0 ? "in_progress" : "not_started",
      requirementLevel: "required",
      completedItems: validSpaces.length,
      totalItems: activeSpaces.length || 1,
      summary: `${activeSpaces.length} space${activeSpaces.length === 1 ? "" : "s"}`,
      issues: spacesIssues,
    },
    media: {
      id: "media",
      label: "Media",
      completionState: hasMedia ? "complete" : "not_started",
      requirementLevel: "recommended",
      completedItems: profile.mediaItems.length,
      totalItems: profile.mediaItems.length,
      summary: hasMedia ? `${profile.mediaCollections.length} galleries` : "Not started",
      issues: mediaIssues,
    },
    logistics: {
      id: "logistics",
      label: "Logistics",
      completionState: hasLogistics ? "complete" : "not_started",
      requirementLevel: "required",
      completedItems: hasLogistics ? 1 : 0,
      totalItems: 1,
      summary: hasLogistics ? "Complete" : "Missing fields",
      issues: logisticsIssues,
    },
    faqs: {
      id: "faqs",
      label: "FAQs",
      completionState: activeFaqs.length > 0 ? "complete" : "not_started",
      requirementLevel: "optional",
      completedItems: activeFaqs.length,
      totalItems: activeFaqs.length,
      summary: activeFaqs.length > 0 ? `${activeFaqs.length} questions` : "Not started",
      issues: [],
    },
    packages: {
      id: "packages",
      label: "Packages",
      completionState: packageCount === 0 ? "not_started" : hasPackageLinks ? "complete" : "not_started",
      requirementLevel: "optional",
      completedItems: profile.packageSpaces.length,
      totalItems: packageCount,
      summary: packageCount > 0 ? `${profile.packageSpaces.length} links` : "No packages",
      issues: [],
    },
    review: {
      id: "review",
      label: "Review and publish",
      completionState: allRequiredIssues.length > 0 ? "blocked" : "needs_attention",
      requirementLevel: "required",
      completedItems: allRequiredIssues.length === 0 ? 1 : 0,
      totalItems: 1,
      summary: allRequiredIssues.length > 0 ? `${allRequiredIssues.length} issues` : "Ready to publish",
      issues: allIssues,
    },
  };
}

export function getPublishBlockingIssues(
  profile: DraftStructuredVenueProfile | null,
) {
  if (!profile) return ["Create a structured profile draft first."];

  const statuses = getProfileSectionStatuses(profile);
  return statuses.review.issues.map(i => i.title);
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

// Backwards compatibility aliases
export type StructuredEditorSectionId = ProfileSectionId;
export type StructuredEditorSectionStatus = CompletionState;
export const getStructuredSectionStatuses = getProfileSectionStatuses;
