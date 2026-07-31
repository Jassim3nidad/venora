import type { Tables, TablesInsert, TablesUpdate } from "@venora/database";
import { EVENT_TYPE_OPTIONS } from "../domain/event-plan.constants";
import type {
  EventPlanDraft,
  EventPlanStatus,
  PersistedEventPlan,
} from "../domain/event-plan.types";

type EventPlanRow = Tables<"event_plans">;
type EventPlanInsert = TablesInsert<"event_plans">;
type EventPlanUpdate = TablesUpdate<"event_plans">;
type QueryError = { message?: string } | null;
type QueryResponse<T> = Promise<{ data: T; error: QueryError }>;
type SingleInsertQuery = {
  select(columns: "*"): { single(): QueryResponse<EventPlanRow> };
};
type FilterQuery = {
  eq(column: string, value: string): FilterQuery;
  maybeSingle(): QueryResponse<EventPlanRow | null>;
  order(
    column: string,
    options: { ascending: boolean },
  ): QueryResponse<EventPlanRow[]>;
  select(columns: "*"): {
    maybeSingle(): QueryResponse<EventPlanRow | null>;
  };
};
type EventPlanTable = {
  insert(payload: EventPlanInsert): SingleInsertQuery;
  update(payload: EventPlanUpdate): FilterQuery;
  select(columns: "*"): FilterQuery;
};
export type EventPlanClient = {
  from(table: "event_plans"): EventPlanTable;
};

export class EventPlanRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventPlanRepositoryError";
  }
}

function raiseDatabaseError(error: { message?: string } | null) {
  if (error) {
    throw new EventPlanRepositoryError(error.message ?? "Event plan query failed");
  }
}

function isValidEventPlanStatus(status: string): status is EventPlanStatus {
  return [
    "draft",
    "completed",
    "archived",
    "converted_to_inquiry",
    "converted_to_booking",
  ].includes(status);
}

function defaultTitle(draft: EventPlanDraft) {
  const eventTypeLabel =
    EVENT_TYPE_OPTIONS.find((option) => option.value === draft.eventType)
      ?.label ?? "Event";

  if (draft.preferredCity) return `${eventTypeLabel} in ${draft.preferredCity}`;
  if (draft.preferredProvince) {
    return `${eventTypeLabel} in ${draft.preferredProvince}`;
  }

  return `${eventTypeLabel} event plan`;
}

function guestRangeToBounds(
  guestCountRange: EventPlanDraft["guestCountRange"],
): { min: number | null; max: number | null } {
  switch (guestCountRange) {
    case "under-50":
      return { min: 1, max: 49 };
    case "50-100":
      return { min: 50, max: 100 };
    case "101-150":
      return { min: 101, max: 150 };
    case "151-200":
      return { min: 151, max: 200 };
    case "201-300":
      return { min: 201, max: 300 };
    case "over-300":
      return { min: 301, max: null };
    default:
      return { min: null, max: null };
  }
}

function createBasePayload(draft: EventPlanDraft) {
  if (!draft.eventType) {
    throw new EventPlanRepositoryError("Event type is required");
  }

  const guestBounds = guestRangeToBounds(draft.guestCountRange);

  return {
    event_type_key: draft.eventType,
    custom_event_type: draft.customEventType,
    date_preference_type: draft.datePreferenceType ?? "flexible",
    exact_event_date: draft.exactDate,
    date_range_start: draft.preferredDateStart,
    date_range_end: draft.preferredDateEnd,
    preferred_month: draft.preferredMonth,
    preferred_year: draft.preferredYear,
    preferred_day_of_week: draft.preferredDayOfWeek,
    preferred_time_of_day: draft.preferredTimeOfDay,
    province: draft.preferredProvince,
    city: draft.preferredCity,
    nearby_locations_allowed: draft.nearbyLocationsAllowed,
    expected_guest_count: draft.expectedGuestCount,
    guest_count_range: draft.guestCountRange,
    guest_count_min: guestBounds.min,
    guest_count_max: guestBounds.max,
    budget_min: draft.budgetMin,
    budget_max: draft.budgetMax,
    budget_preference: draft.budgetPreference,
    currency: draft.currency,
    venue_styles: [...draft.venueStyles],
    setting_preference: draft.settingPreference,
    ranked_priorities: [...draft.rankedPriorities],
    required_amenities: [...draft.requiredAmenities],
    additional_requirements: draft.additionalRequirements,
    services_needed: [...draft.servicesNeeded],
    custom_service: draft.customService,
    service_selection_mode: draft.serviceSelectionMode,
    package_preference: draft.packagePreference,
    accredited_supplier_preference: draft.accreditedSupplierPreference,
    payment_preference: draft.paymentPreference,
    booking_urgency: draft.bookingUrgency,
    decision_maker_type: draft.decisionMakerType,
    completion_step: draft.currentStep,
  } satisfies Omit<EventPlanInsert, "customer_id" | "title">;
}

export function mapEventPlanRow(row: EventPlanRow): PersistedEventPlan {
  return {
    schemaVersion: 1,
    currentStep: row.completion_step,
    eventType: row.event_type_key as EventPlanDraft["eventType"],
    customEventType: row.custom_event_type,
    datePreferenceType:
      row.date_preference_type as EventPlanDraft["datePreferenceType"],
    exactDate: row.exact_event_date,
    preferredDateStart: row.date_range_start,
    preferredDateEnd: row.date_range_end,
    preferredMonth: row.preferred_month,
    preferredYear: row.preferred_year,
    preferredDayOfWeek:
      row.preferred_day_of_week as EventPlanDraft["preferredDayOfWeek"],
    preferredTimeOfDay:
      row.preferred_time_of_day as EventPlanDraft["preferredTimeOfDay"],
    preferredProvince: row.province,
    preferredCity: row.city,
    nearbyLocationsAllowed: row.nearby_locations_allowed,
    expectedGuestCount: row.expected_guest_count,
    guestCountRange:
      row.guest_count_range as EventPlanDraft["guestCountRange"],
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    budgetPreference:
      row.budget_preference as EventPlanDraft["budgetPreference"],
    currency: row.currency,
    venueStyles: row.venue_styles as EventPlanDraft["venueStyles"],
    settingPreference:
      row.setting_preference as EventPlanDraft["settingPreference"],
    rankedPriorities:
      row.ranked_priorities as EventPlanDraft["rankedPriorities"],
    requiredAmenities:
      row.required_amenities as EventPlanDraft["requiredAmenities"],
    additionalRequirements: row.additional_requirements,
    servicesNeeded: row.services_needed as EventPlanDraft["servicesNeeded"],
    customService: row.custom_service,
    serviceSelectionMode:
      row.service_selection_mode as EventPlanDraft["serviceSelectionMode"],
    packagePreference:
      row.package_preference as EventPlanDraft["packagePreference"],
    accreditedSupplierPreference:
      row.accredited_supplier_preference as EventPlanDraft["accreditedSupplierPreference"],
    paymentPreference:
      row.payment_preference as EventPlanDraft["paymentPreference"],
    bookingUrgency:
      row.booking_urgency as EventPlanDraft["bookingUrgency"],
    decisionMakerType:
      row.decision_maker_type as EventPlanDraft["decisionMakerType"],
    completedSteps: [],
    updatedAt: row.updated_at,
    id: row.id,
    customerId: row.customer_id,
    title: row.title ?? defaultTitleFromRow(row),
    status: isValidEventPlanStatus(row.status) ? row.status : "draft",
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function defaultTitleFromRow(row: EventPlanRow) {
  const eventTypeLabel =
    EVENT_TYPE_OPTIONS.find((option) => option.value === row.event_type_key)
      ?.label ?? "Event";

  if (row.city) return `${eventTypeLabel} in ${row.city}`;
  if (row.province) return `${eventTypeLabel} in ${row.province}`;

  return `${eventTypeLabel} event plan`;
}

export function createEventPlanRepository(supabase: EventPlanClient) {
  return {
    async createForCustomer(
      customerId: string,
      draft: EventPlanDraft,
      options: {
        title?: string | null;
        sourceDraftFingerprint?: string | null;
      } = {},
    ): Promise<PersistedEventPlan> {
      const payload: EventPlanInsert = {
        customer_id: customerId,
        title: options.title?.trim() || defaultTitle(draft),
        source_draft_fingerprint: options.sourceDraftFingerprint ?? null,
        ...createBasePayload(draft),
      };

      const { data, error } = await supabase
        .from("event_plans")
        .insert(payload)
        .select("*")
        .single();

      raiseDatabaseError(error);

      return mapEventPlanRow(data as EventPlanRow);
    },

    async findByIdForCustomer(
      customerId: string,
      planId: string,
    ): Promise<PersistedEventPlan | null> {
      const { data, error } = await supabase
        .from("event_plans")
        .select("*")
        .eq("id", planId)
        .eq("customer_id", customerId)
        .maybeSingle();

      raiseDatabaseError(error);

      return data ? mapEventPlanRow(data as EventPlanRow) : null;
    },

    async findBySourceDraftFingerprintForCustomer(
      customerId: string,
      sourceDraftFingerprint: string,
    ): Promise<PersistedEventPlan | null> {
      const { data, error } = await supabase
        .from("event_plans")
        .select("*")
        .eq("customer_id", customerId)
        .eq("source_draft_fingerprint", sourceDraftFingerprint)
        .maybeSingle();

      raiseDatabaseError(error);

      return data ? mapEventPlanRow(data as EventPlanRow) : null;
    },

    async listForCustomer(customerId: string): Promise<PersistedEventPlan[]> {
      const { data, error } = await supabase
        .from("event_plans")
        .select("*")
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false });

      raiseDatabaseError(error);

      return (data ?? []).map((row) => mapEventPlanRow(row as EventPlanRow));
    },

    async updateForCustomer(
      customerId: string,
      planId: string,
      draft: EventPlanDraft,
      options: { title?: string | null } = {},
    ): Promise<PersistedEventPlan | null> {
      const payload: EventPlanUpdate = {
        ...createBasePayload(draft),
      };

      if (options.title !== undefined) {
        payload.title = options.title?.trim() || defaultTitle(draft);
      }

      const { data, error } = await supabase
        .from("event_plans")
        .update(payload)
        .eq("id", planId)
        .eq("customer_id", customerId)
        .select("*")
        .maybeSingle();

      raiseDatabaseError(error);

      return data ? mapEventPlanRow(data as EventPlanRow) : null;
    },

    async archiveForCustomer(
      customerId: string,
      planId: string,
    ): Promise<PersistedEventPlan | null> {
      const { data, error } = await supabase
        .from("event_plans")
        .update({
          status: "archived",
          archived_at: new Date().toISOString(),
        } satisfies EventPlanUpdate)
        .eq("id", planId)
        .eq("customer_id", customerId)
        .select("*")
        .maybeSingle();

      raiseDatabaseError(error);

      return data ? mapEventPlanRow(data as EventPlanRow) : null;
    },
  };
}
