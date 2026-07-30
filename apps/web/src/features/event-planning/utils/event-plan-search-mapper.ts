import { VENUE_STYLE_OPTIONS } from "../domain/event-plan.constants";
import type { AmenityRequirement, EventPlanDraft } from "../domain/event-plan.types";

const SEARCHABLE_VENUE_TYPES = new Set([
  "garden",
  "beach",
  "resort",
  "hotel",
  "restaurant",
  "church",
]);

const AMENITY_SEARCH_LABELS: Partial<Record<AmenityRequirement, string>> = {
  parking: "Parking",
  "air-conditioning": "Air Conditioning",
  "accessible-entrance": "Wheelchair Accessible",
  "accessible-restroom": "Wheelchair Accessible",
  "preparation-room": "Bridal Suite",
  stage: "Stage",
  "sound-system": "Sound System",
  kitchen: "Catering Kitchen",
  "catering-prep": "Catering Kitchen",
  accommodation: "Overnight Accommodation",
  "ceremony-area": "Garden Area",
  wifi: "Wi-Fi",
  generator: "Backup Generator",
  "pet-friendly": "Pet Friendly",
};

function setIfPresent(params: URLSearchParams, key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return;
  params.set(key, String(value));
}

function mapVenueTypes(draft: EventPlanDraft) {
  return [
    ...new Set(
      draft.venueStyles
        .map(
          (style) =>
            VENUE_STYLE_OPTIONS.find((option) => option.value === style)
              ?.databaseName ?? style,
        )
        .map((value) => value.toLowerCase().replace(/\s+/g, "-"))
        .filter((value) => SEARCHABLE_VENUE_TYPES.has(value)),
    ),
  ];
}

function mapAmenities(draft: EventPlanDraft) {
  return [
    ...new Set(
      draft.requiredAmenities
        .map((amenity) => AMENITY_SEARCH_LABELS[amenity])
        .filter((amenity): amenity is string => Boolean(amenity)),
    ),
  ];
}

export function mapEventPlanToVenueSearchParams(draft: EventPlanDraft) {
  const params = new URLSearchParams();

  setIfPresent(
    params,
    "event",
    draft.eventType === "other" ? draft.customEventType : draft.eventType,
  );
  setIfPresent(params, "province", draft.preferredProvince);
  setIfPresent(params, "city", draft.preferredCity);
  setIfPresent(params, "capacity", draft.expectedGuestCount);

  const venueTypes = mapVenueTypes(draft);
  if (venueTypes.length > 0) params.set("venueTypes", venueTypes.join(","));

  if (
    draft.settingPreference === "indoor" ||
    draft.settingPreference === "outdoor" ||
    draft.settingPreference === "both"
  ) {
    params.set("indoorOutdoor", draft.settingPreference);
  }

  const amenities = mapAmenities(draft);
  if (amenities.length > 0) params.set("amenities", amenities.join(","));

  params.set("sort", "recommended");
  return params;
}

export function createVenueSearchHrefFromEventPlan(draft: EventPlanDraft) {
  const params = mapEventPlanToVenueSearchParams(draft);
  const query = params.toString();
  return query ? `/venues?${query}` : "/venues";
}
