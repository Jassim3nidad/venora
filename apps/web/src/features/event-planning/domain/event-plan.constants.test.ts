import { describe, expect, it } from "vitest";
import {
  ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS,
  AMENITY_REQUIREMENT_OPTIONS,
  BUDGET_PREFERENCE_OPTIONS,
  BOOKING_URGENCY_OPTIONS,
  DATE_PREFERENCE_OPTIONS,
  DECISION_MAKER_OPTIONS,
  EVENT_PLAN_DRAFT_SCHEMA_VERSION,
  EVENT_PLAN_DRAFT_STORAGE_KEY,
  EVENT_PLAN_STATUS_OPTIONS,
  EVENT_PLANNING_STEPS,
  EVENT_TYPE_OPTIONS,
  GUEST_COUNT_RANGE_OPTIONS,
  PACKAGE_PREFERENCE_OPTIONS,
  PAYMENT_PREFERENCE_OPTIONS,
  PRIORITY_FACTOR_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  VENUE_SETTING_OPTIONS,
  VENUE_STYLE_OPTIONS,
  createDefaultEventPlanDraft,
} from "./event-plan.constants";

function values(options: ReadonlyArray<{ value: string }>) {
  return options.map((option) => option.value);
}

function expectUnique(items: readonly string[]) {
  expect(new Set(items).size).toBe(items.length);
}

describe("event plan domain constants", () => {
  it("creates a default draft with the approved schema version and first step", () => {
    const draft = createDefaultEventPlanDraft("2026-07-30T00:00:00.000Z");

    expect(draft.schemaVersion).toBe(EVENT_PLAN_DRAFT_SCHEMA_VERSION);
    expect(EVENT_PLAN_DRAFT_STORAGE_KEY).toBe("venora:event-plan-draft:v1");
    expect(draft.currentStep).toBe("event-basics");
    expect(draft.currentStep).toBe(EVENT_PLANNING_STEPS[0].id);
    expect(draft.currency).toBe("PHP");
    expect(draft.updatedAt).toBe("2026-07-30T00:00:00.000Z");
  });

  it("uses null for unanswered scalar fields and empty arrays for multi-select fields", () => {
    const draft = createDefaultEventPlanDraft("2026-07-30T00:00:00.000Z");

    expect(draft.eventType).toBeNull();
    expect(draft.customEventType).toBeNull();
    expect(draft.datePreferenceType).toBeNull();
    expect(draft.exactDate).toBeNull();
    expect(draft.preferredDateStart).toBeNull();
    expect(draft.preferredDateEnd).toBeNull();
    expect(draft.preferredMonth).toBeNull();
    expect(draft.preferredYear).toBeNull();
    expect(draft.preferredProvince).toBeNull();
    expect(draft.preferredCity).toBeNull();
    expect(draft.nearbyLocationsAllowed).toBeNull();
    expect(draft.expectedGuestCount).toBeNull();
    expect(draft.guestCountRange).toBeNull();
    expect(draft.budgetMin).toBeNull();
    expect(draft.budgetMax).toBeNull();
    expect(draft.budgetPreference).toBeNull();
    expect(draft.settingPreference).toBeNull();
    expect(draft.additionalRequirements).toBeNull();
    expect(draft.customService).toBeNull();
    expect(draft.packagePreference).toBeNull();
    expect(draft.accreditedSupplierPreference).toBeNull();
    expect(draft.paymentPreference).toBeNull();
    expect(draft.bookingUrgency).toBeNull();
    expect(draft.decisionMakerType).toBeNull();

    expect(draft.venueStyles).toEqual([]);
    expect(draft.rankedPriorities).toEqual([]);
    expect(draft.requiredAmenities).toEqual([]);
    expect(draft.servicesNeeded).toEqual([]);
    expect(draft.completedSteps).toEqual([]);
    expect(draft.serviceSelectionMode).toBe("needs-services");
  });

  it("defines the approved questionnaire step order", () => {
    expect(EVENT_PLANNING_STEPS.map((step) => step.id)).toEqual([
      "event-basics",
      "date-location",
      "guests-budget",
      "venue-style",
      "requirements",
      "services",
      "booking-preferences",
      "summary",
    ]);
  });

  it("does not duplicate values in allowlisted option groups", () => {
    [
      EVENT_TYPE_OPTIONS,
      DATE_PREFERENCE_OPTIONS,
      GUEST_COUNT_RANGE_OPTIONS,
      BUDGET_PREFERENCE_OPTIONS,
      VENUE_STYLE_OPTIONS,
      VENUE_SETTING_OPTIONS,
      PRIORITY_FACTOR_OPTIONS,
      AMENITY_REQUIREMENT_OPTIONS,
      SERVICE_CATEGORY_OPTIONS,
      PACKAGE_PREFERENCE_OPTIONS,
      ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS,
      PAYMENT_PREFERENCE_OPTIONS,
      BOOKING_URGENCY_OPTIONS,
      DECISION_MAKER_OPTIONS,
      EVENT_PLAN_STATUS_OPTIONS,
    ].forEach((options) => expectUnique(values(options)));
  });

  it("maps existing event, venue, amenity, and supplier lookup labels explicitly", () => {
    expect(EVENT_TYPE_OPTIONS.map((option) => option.databaseName)).toContain(
      "Wedding",
    );
    expect(EVENT_TYPE_OPTIONS.map((option) => option.databaseName)).toContain(
      "Product Launch",
    );
    expect(VENUE_STYLE_OPTIONS.map((option) => option.databaseName)).toContain(
      "Garden",
    );
    expect(VENUE_STYLE_OPTIONS.map((option) => option.databaseName)).toContain(
      "Resort",
    );
    expect(
      AMENITY_REQUIREMENT_OPTIONS.map((option) => option.databaseName),
    ).toContain("Parking");
    expect(
      AMENITY_REQUIREMENT_OPTIONS.map((option) => option.databaseName),
    ).toContain("Wi-Fi");
    expect(
      SERVICE_CATEGORY_OPTIONS.map((option) => option.databaseName),
    ).toContain("Catering");
    expect(
      SERVICE_CATEGORY_OPTIONS.map((option) => option.databaseName),
    ).toContain("Photo Booth");
  });

  it("uses the approved event-plan statuses", () => {
    expect(values(EVENT_PLAN_STATUS_OPTIONS)).toEqual([
      "draft",
      "completed",
      "archived",
      "converted_to_inquiry",
      "converted_to_booking",
    ]);
  });
});
