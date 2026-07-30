import { describe, expect, it, vi } from "vitest";
import { createDefaultEventPlanDraft } from "../domain/event-plan.constants";
import type { EventPlanDraft } from "../domain/event-plan.types";
import {
  createEventPlanRepository,
  mapEventPlanRow,
} from "./event-plan.repository";

const customerId = "00000000-0000-4000-8000-000000000001";
const planId = "00000000-0000-4000-8000-000000000002";

const eventPlanRow = {
  id: planId,
  customer_id: customerId,
  event_type_id: "00000000-0000-4000-8000-000000000003",
  title: "Wedding in Cavite",
  event_name: "Garden wedding",
  event_type_key: "wedding",
  custom_event_type: null,
  date_preference_type: "exact",
  exact_event_date: "2026-12-12",
  date_range_start: null,
  date_range_end: null,
  preferred_month: null,
  preferred_year: null,
  preferred_day_of_week: "saturday",
  preferred_time_of_day: "evening",
  province: "Cavite",
  city: "Tagaytay",
  nearby_locations_allowed: true,
  expected_guest_count: 120,
  guest_count_range: null,
  guest_count_min: null,
  guest_count_max: null,
  budget_min: 80000,
  budget_max: 150000,
  budget_preference: "custom",
  currency: "PHP",
  venue_styles: ["garden", "elegant"],
  setting_preference: "outdoor",
  ranked_priorities: ["location", "budget"],
  required_amenities: ["parking"],
  additional_requirements: "Needs covered ceremony option",
  services_needed: ["catering", "photography"],
  custom_service: null,
  service_selection_mode: "needs-services",
  package_preference: "compare-both",
  accredited_supplier_preference: "maybe",
  payment_preference: "deposit-balance",
  booking_urgency: "within-1-3-months",
  decision_maker_type: "partner-family",
  status: "draft",
  completion_step: "summary",
  source_draft_fingerprint: "fingerprint-1",
  converted_inquiry_id: null,
  converted_booking_id: null,
  created_at: "2026-07-30T00:00:00.000Z",
  updated_at: "2026-07-30T01:00:00.000Z",
  archived_at: null,
  converted_at: null,
};

function createDraft(): EventPlanDraft {
  return {
    ...createDefaultEventPlanDraft("2026-07-30T01:00:00.000Z"),
    currentStep: "summary",
    eventType: "wedding",
    datePreferenceType: "exact",
    exactDate: "2026-12-12",
    preferredDayOfWeek: "saturday",
    preferredTimeOfDay: "evening",
    preferredProvince: "Cavite",
    preferredCity: "Tagaytay",
    nearbyLocationsAllowed: true,
    expectedGuestCount: 120,
    budgetPreference: "custom",
    budgetMin: 80000,
    budgetMax: 150000,
    venueStyles: ["garden", "elegant"],
    settingPreference: "outdoor",
    rankedPriorities: ["location", "budget"],
    requiredAmenities: ["parking"],
    additionalRequirements: "Needs covered ceremony option",
    servicesNeeded: ["catering", "photography"],
    packagePreference: "compare-both",
    accreditedSupplierPreference: "maybe",
    paymentPreference: "deposit-balance",
    bookingUrgency: "within-1-3-months",
    decisionMakerType: "partner-family",
    completedSteps: [
      "event-basics",
      "date-location",
      "guests-budget",
      "venue-style",
      "requirements",
      "services",
      "booking-preferences",
      "summary",
    ],
  };
}

function queryResult(result: unknown) {
  const query: any = {};
  Object.assign(query, {
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  });
  return query;
}

describe("event plan repository", () => {
  it("creates plans by forcing authenticated customer ownership", async () => {
    const query = queryResult({ data: eventPlanRow, error: null });
    const supabase = { from: vi.fn(() => query) };
    const repository = createEventPlanRepository(supabase as never);

    const result = await repository.createForCustomer(customerId, createDraft(), {
      title: "Wedding in Cavite",
      sourceDraftFingerprint: "fingerprint-1",
    });

    expect(result.customerId).toBe(customerId);
    expect(supabase.from).toHaveBeenCalledWith("event_plans");
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: customerId,
        title: "Wedding in Cavite",
        event_type_key: "wedding",
        exact_event_date: "2026-12-12",
        preferred_day_of_week: "saturday",
        preferred_time_of_day: "evening",
        province: "Cavite",
        city: "Tagaytay",
        expected_guest_count: 120,
        source_draft_fingerprint: "fingerprint-1",
      }),
    );
  });

  it("scopes lookup by event plan id and authenticated customer", async () => {
    const query = queryResult({ data: eventPlanRow, error: null });
    const repository = createEventPlanRepository({
      from: vi.fn(() => query),
    } as never);

    await repository.findByIdForCustomer(customerId, planId);

    expect(query.eq).toHaveBeenCalledWith("id", planId);
    expect(query.eq).toHaveBeenCalledWith("customer_id", customerId);
  });

  it("scopes updates by event plan id and authenticated customer", async () => {
    const query = queryResult({ data: eventPlanRow, error: null });
    const repository = createEventPlanRepository({
      from: vi.fn(() => query),
    } as never);

    await repository.updateForCustomer(customerId, planId, createDraft(), {
      title: "Updated plan",
    });

    const payload = query.update.mock.calls[0]?.[0];
    expect(payload).toEqual(
      expect.objectContaining({
        title: "Updated plan",
        event_type_key: "wedding",
      }),
    );
    expect(payload).not.toHaveProperty("customer_id");
    expect(query.eq).toHaveBeenCalledWith("id", planId);
    expect(query.eq).toHaveBeenCalledWith("customer_id", customerId);
  });

  it("archives by authenticated customer without deleting the plan", async () => {
    const query = queryResult({
      data: { ...eventPlanRow, status: "archived", archived_at: "now" },
      error: null,
    });
    const repository = createEventPlanRepository({
      from: vi.fn(() => query),
    } as never);

    await repository.archiveForCustomer(customerId, planId);

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "archived" }),
    );
    expect(query.eq).toHaveBeenCalledWith("id", planId);
    expect(query.eq).toHaveBeenCalledWith("customer_id", customerId);
  });

  it("maps snake_case rows to the persisted event plan domain shape", () => {
    expect(mapEventPlanRow(eventPlanRow as never)).toEqual(
      expect.objectContaining({
        id: planId,
        customerId,
        title: "Wedding in Cavite",
        status: "draft",
        currentStep: "summary",
        eventType: "wedding",
        exactDate: "2026-12-12",
        preferredProvince: "Cavite",
        preferredCity: "Tagaytay",
        expectedGuestCount: 120,
        venueStyles: ["garden", "elegant"],
        servicesNeeded: ["catering", "photography"],
        createdAt: "2026-07-30T00:00:00.000Z",
        archivedAt: null,
      }),
    );
  });
});
