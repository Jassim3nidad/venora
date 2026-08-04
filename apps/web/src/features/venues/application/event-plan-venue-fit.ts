import {
  AMENITY_REQUIREMENT_OPTIONS,
  EVENT_TYPE_OPTIONS,
} from "@/src/features/event-planning/domain/event-plan.constants";
import type { PersistedEventPlan } from "@/src/features/event-planning/domain/event-plan.types";
import type { PublicVenueProfileViewModel } from "./public-venue-profile";

export type EventPlanFitExplanation = {
  key: string;
  title: string;
  detail: string;
};

export type EventPlanVenueFit = {
  explanations: EventPlanFitExplanation[];
  confirmationNote: string;
};

function normalized(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function includesNormalized(values: string[], expected: string) {
  const target = normalized(expected);
  return values.some((value) => normalized(value) === target);
}

function settingMatches(
  preference: PersistedEventPlan["settingPreference"],
  profile: PublicVenueProfileViewModel,
) {
  if (!preference || preference === "no-preference") return false;
  const settings = [
    profile.venue.setting,
    ...profile.spaces.map((space) => space.setting),
  ].map(normalized);

  if (preference === "both") {
    return (
      settings.some((setting) => setting.includes("both")) ||
      (settings.some((setting) => setting.includes("indoor")) &&
        settings.some((setting) => setting.includes("outdoor")))
    );
  }

  return settings.some((setting) => setting.includes(preference));
}

function findGuestFit(
  expectedGuests: number | null,
  profile: PublicVenueProfileViewModel,
) {
  if (!expectedGuests) return null;
  const fittingSpace = profile.spaces
    .filter((space) => space.capacityMax >= expectedGuests)
    .sort((a, b) => a.capacityMax - b.capacityMax)[0];

  if (fittingSpace) {
    return {
      key: "guest-count",
      title: "Your group fits a published space",
      detail: `${fittingSpace.name} lists capacity for up to ${fittingSpace.capacityMax.toLocaleString("en-PH")} guests, including your expected ${expectedGuests.toLocaleString("en-PH")}.`,
    } satisfies EventPlanFitExplanation;
  }

  if (
    profile.venue.capacityMax &&
    profile.venue.capacityMax >= expectedGuests
  ) {
    return {
      key: "guest-count",
      title: "The listed venue capacity fits your group",
      detail: `The venue lists capacity for up to ${profile.venue.capacityMax.toLocaleString("en-PH")} guests, including your expected ${expectedGuests.toLocaleString("en-PH")}.`,
    } satisfies EventPlanFitExplanation;
  }

  return null;
}

function getAmenityExplanations(
  plan: PersistedEventPlan,
  profile: PublicVenueProfileViewModel,
) {
  const explanations: EventPlanFitExplanation[] = [];
  const logisticsKeys = new Set(profile.logistics.map((item) => item.key));
  const hasIndoorSpace = profile.spaces.some((space) =>
    normalized(space.setting).includes("indoor"),
  );

  for (const requirement of plan.requiredAmenities) {
    if (requirement === "none") continue;

    if (
      requirement === "parking" &&
      (logisticsKeys.has("parking") || logisticsKeys.has("parking-capacity"))
    ) {
      explanations.push({
        key: "amenity-parking",
        title: "Parking information is published",
        detail: "The venue has provided parking details for customers to review.",
      });
      continue;
    }

    if (
      (requirement === "accessible-entrance" ||
        requirement === "accessible-restroom") &&
      logisticsKeys.has("accessibility")
    ) {
      explanations.push({
        key: "amenity-accessibility",
        title: "Accessibility information is available",
        detail: "The venue has published accessibility details relevant to your plan.",
      });
      continue;
    }

    if (
      requirement === "backup-indoor-space" &&
      hasIndoorSpace &&
      logisticsKeys.has("weather-backup")
    ) {
      explanations.push({
        key: "amenity-weather-backup",
        title: "A weather-backup option is documented",
        detail: "The property has a published indoor space and weather-backup information.",
      });
      continue;
    }

    const option = AMENITY_REQUIREMENT_OPTIONS.find(
      (item) => item.value === requirement,
    );
    if (!option?.databaseName) continue;
    if (!includesNormalized(profile.amenities, option.databaseName)) continue;

    explanations.push({
      key: `amenity-${requirement}`,
      title: `${option.label} is listed`,
      detail: `The venue includes ${option.label.toLocaleLowerCase()} in its published amenities.`,
    });
  }

  return explanations.filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.key === item.key) === index,
  );
}

export function selectLatestUsableEventPlan(plans: PersistedEventPlan[]) {
  return (
    plans.find(
      (plan) =>
        plan.status !== "archived" &&
        Boolean(plan.eventType) &&
        plan.archivedAt === null,
    ) ?? null
  );
}

export function buildEventPlanVenueFit(
  plan: PersistedEventPlan,
  profile: PublicVenueProfileViewModel,
): EventPlanVenueFit {
  const explanations: EventPlanFitExplanation[] = [];
  const guestFit = findGuestFit(plan.expectedGuestCount, profile);
  if (guestFit) explanations.push(guestFit);

  if (
    plan.preferredProvince &&
    normalized(plan.preferredProvince) === normalized(profile.venue.province)
  ) {
    explanations.push({
      key: "province",
      title: "In your preferred province",
      detail: `${profile.venue.name} is located in ${profile.venue.province}.`,
    });
  }

  if (
    plan.preferredCity &&
    normalized(plan.preferredCity) === normalized(profile.venue.city)
  ) {
    explanations.push({
      key: "city",
      title: "In your preferred city or municipality",
      detail: `${profile.venue.name} is listed in ${profile.venue.city}.`,
    });
  }

  if (settingMatches(plan.settingPreference, profile)) {
    explanations.push({
      key: "setting",
      title: "Supports your preferred setting",
      detail: `Published venue information includes ${plan.settingPreference === "both" ? "indoor and outdoor" : plan.settingPreference} space.`,
    });
  }

  if (plan.eventType) {
    const eventType = EVENT_TYPE_OPTIONS.find(
      (item) => item.value === plan.eventType,
    );
    const expectedName =
      plan.eventType === "other" ? plan.customEventType : eventType?.databaseName;
    if (expectedName && includesNormalized(profile.eventTypes, expectedName)) {
      explanations.push({
        key: "event-type",
        title: `${eventType?.label ?? expectedName} is supported`,
        detail: "This event type is connected to the venue's published spaces.",
      });
    }
  }

  explanations.push(...getAmenityExplanations(plan, profile));

  return {
    explanations,
    confirmationNote:
      "Availability and final pricing still need confirmation from the venue.",
  };
}
