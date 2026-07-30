import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createDefaultEventPlanDraft } from "../domain/event-plan.constants";
import type { EventPlanDraft } from "../domain/event-plan.types";
import {
  archiveEventPlanAction,
  createEventPlanAction,
  saveAnonymousEventPlanDraftAction,
  updateEventPlanAction,
} from "./event-plan.actions";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const userId = "00000000-0000-4000-8000-000000000001";
const planId = "00000000-0000-4000-8000-000000000002";

const eventPlanRow = {
  id: planId,
  customer_id: userId,
  event_type_id: null,
  title: "Wedding in Cavite",
  event_name: null,
  event_type_key: "wedding",
  custom_event_type: null,
  date_preference_type: "exact",
  exact_event_date: "2026-12-12",
  date_range_start: null,
  date_range_end: null,
  preferred_month: null,
  preferred_year: null,
  preferred_day_of_week: null,
  preferred_time_of_day: null,
  province: "Cavite",
  city: "Tagaytay",
  nearby_locations_allowed: true,
  expected_guest_count: 120,
  guest_count_range: null,
  guest_count_min: null,
  guest_count_max: null,
  budget_min: null,
  budget_max: null,
  budget_preference: "not-sure",
  currency: "PHP",
  venue_styles: [],
  setting_preference: null,
  ranked_priorities: [],
  required_amenities: [],
  additional_requirements: null,
  services_needed: [],
  custom_service: null,
  service_selection_mode: "needs-services",
  package_preference: null,
  accredited_supplier_preference: null,
  payment_preference: null,
  booking_urgency: null,
  decision_maker_type: null,
  status: "draft",
  completion_step: "date-location",
  source_draft_fingerprint: "fingerprint-1",
  converted_inquiry_id: null,
  converted_booking_id: null,
  created_at: "2026-07-30T00:00:00.000Z",
  updated_at: "2026-07-30T01:00:00.000Z",
  archived_at: null,
  converted_at: null,
};

function validDraft(): EventPlanDraft {
  return {
    ...createDefaultEventPlanDraft("2026-07-30T01:00:00.000Z"),
    currentStep: "date-location",
    eventType: "wedding",
    datePreferenceType: "exact",
    exactDate: "2026-12-12",
    preferredProvince: "Cavite",
    preferredCity: "Tagaytay",
    nearbyLocationsAllowed: true,
    expectedGuestCount: 120,
    budgetPreference: "not-sure",
    completedSteps: ["event-basics", "date-location"],
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

function mockSupabase(builders: unknown[]) {
  const queue = [...builders];
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: vi.fn(() => {
      const next = queue.shift();
      if (!next) throw new Error("Unexpected query");
      return next;
    }),
  };

  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return supabase;
}

describe("event plan actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated create requests before touching tables", async () => {
    const from = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from,
    } as never);

    const result = await createEventPlanAction({ draft: validDraft() });

    expect(result).toEqual({
      success: false,
      error: "Sign in to save your event plan.",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("creates an event plan for the authenticated customer", async () => {
    const createQuery = queryResult({ data: eventPlanRow, error: null });
    mockSupabase([createQuery]);

    const result = await createEventPlanAction({
      draft: validDraft(),
      title: "Wedding in Cavite",
    });

    expect(result.success).toBe(true);
    expect(createQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: userId,
        title: "Wedding in Cavite",
        event_type_key: "wedding",
      }),
    );
  });

  it("returns the existing plan when an anonymous draft fingerprint already exists", async () => {
    const existingQuery = queryResult({ data: eventPlanRow, error: null });
    const supabase = mockSupabase([existingQuery]);

    const result = await saveAnonymousEventPlanDraftAction({
      draft: validDraft(),
      sourceDraftFingerprint: "fingerprint-1",
    });

    expect(result.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(existingQuery.eq).toHaveBeenCalledWith(
      "source_draft_fingerprint",
      "fingerprint-1",
    );
  });

  it("creates a saved plan for a new anonymous draft fingerprint", async () => {
    const lookupQuery = queryResult({ data: null, error: null });
    const createQuery = queryResult({ data: eventPlanRow, error: null });
    mockSupabase([lookupQuery, createQuery]);

    const result = await saveAnonymousEventPlanDraftAction({
      draft: validDraft(),
      sourceDraftFingerprint: "fingerprint-1",
    });

    expect(result.success).toBe(true);
    expect(createQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: userId,
        source_draft_fingerprint: "fingerprint-1",
      }),
    );
  });

  it("updates only plans owned by the authenticated customer", async () => {
    const updateQuery = queryResult({ data: eventPlanRow, error: null });
    mockSupabase([updateQuery]);

    const result = await updateEventPlanAction({
      planId,
      draft: validDraft(),
      title: "Updated plan",
    });

    expect(result.success).toBe(true);
    expect(updateQuery.eq).toHaveBeenCalledWith("id", planId);
    expect(updateQuery.eq).toHaveBeenCalledWith("customer_id", userId);
  });

  it("archives owned plans without deleting them", async () => {
    const archiveQuery = queryResult({
      data: { ...eventPlanRow, status: "archived", archived_at: "now" },
      error: null,
    });
    mockSupabase([archiveQuery]);

    const result = await archiveEventPlanAction({ planId });

    expect(result.success).toBe(true);
    expect(archiveQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "archived" }),
    );
    expect(archiveQuery.eq).toHaveBeenCalledWith("customer_id", userId);
  });

  it("returns validation errors for incomplete event plans", async () => {
    const supabase = mockSupabase([]);
    const result = await createEventPlanAction({
      draft: createDefaultEventPlanDraft("2026-07-30T01:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({
        error: "Complete the required event plan fields.",
      }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("does not leak database errors to callers", async () => {
    const createQuery = queryResult({
      data: null,
      error: {
        message:
          'new row violates row-level security policy for table "event_plans"',
      },
    });
    mockSupabase([createQuery]);

    const result = await createEventPlanAction({ draft: validDraft() });

    expect(result).toEqual({
      success: false,
      error: "Unable to save event plan. Please try again.",
    });
  });
});
