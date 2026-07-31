import {
  ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS,
  AMENITY_REQUIREMENT_OPTIONS,
  BOOKING_URGENCY_OPTIONS,
  BUDGET_PREFERENCE_OPTIONS,
  DATE_PREFERENCE_OPTIONS,
  DECISION_MAKER_OPTIONS,
  EVENT_TYPE_OPTIONS,
  GUEST_COUNT_RANGE_OPTIONS,
  PACKAGE_PREFERENCE_OPTIONS,
  PAYMENT_PREFERENCE_OPTIONS,
  PRIORITY_FACTOR_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  VENUE_SETTING_OPTIONS,
  VENUE_STYLE_OPTIONS,
} from "../domain/event-plan.constants";
import type {
  EventPlanDraft,
  EventPlanningStep,
} from "../domain/event-plan.types";

type Option = {
  value: string;
  label: string;
};

export type EventPlanSummaryItem = {
  label: string;
  value: string;
  isMissing?: boolean;
};

export type EventPlanSummarySection = {
  id: EventPlanningStep;
  title: string;
  items: EventPlanSummaryItem[];
};

function labelFor(options: readonly Option[], value: string | null) {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? value;
}

function listLabels(options: readonly Option[], values: readonly string[]) {
  return values
    .map((value) => labelFor(options, value))
    .filter((value): value is string => Boolean(value));
}

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function display(value: string | null | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value : fallback;
}

function formatDatePreference(draft: EventPlanDraft) {
  const base = labelFor(DATE_PREFERENCE_OPTIONS, draft.datePreferenceType);

  if (draft.datePreferenceType === "exact") {
    return draft.exactDate ? `${base}: ${draft.exactDate}` : base;
  }

  if (draft.datePreferenceType === "range") {
    return draft.preferredDateStart && draft.preferredDateEnd
      ? `${base}: ${draft.preferredDateStart} to ${draft.preferredDateEnd}`
      : base;
  }

  if (draft.datePreferenceType === "month") {
    return draft.preferredMonth && draft.preferredYear
      ? `${base}: ${draft.preferredMonth}/${draft.preferredYear}`
      : base;
  }

  return base;
}

function formatLocation(draft: EventPlanDraft) {
  if (draft.preferredProvince && draft.preferredCity) {
    return `${draft.preferredCity}, ${draft.preferredProvince}`;
  }

  if (draft.preferredProvince) return draft.preferredProvince;

  return null;
}

function formatGuests(draft: EventPlanDraft) {
  if (draft.expectedGuestCount) {
    return `${draft.expectedGuestCount.toLocaleString("en-PH")} guests`;
  }

  return labelFor(GUEST_COUNT_RANGE_OPTIONS, draft.guestCountRange);
}

function formatBudget(draft: EventPlanDraft) {
  if (draft.budgetPreference === "custom") {
    if (draft.budgetMin !== null && draft.budgetMax !== null) {
      return `${formatPeso(draft.budgetMin)} to ${formatPeso(draft.budgetMax)}`;
    }

    return "Custom range";
  }

  return labelFor(BUDGET_PREFERENCE_OPTIONS, draft.budgetPreference);
}

function formatPriorities(draft: EventPlanDraft) {
  const labels = listLabels(PRIORITY_FACTOR_OPTIONS, draft.rankedPriorities);
  return labels.map((label, index) => `${index + 1}. ${label}`).join("; ");
}

export function buildEventPlanSummarySections(
  draft: EventPlanDraft,
): EventPlanSummarySection[] {
  const eventType =
    draft.eventType === "other"
      ? display(draft.customEventType, "Other event")
      : labelFor(EVENT_TYPE_OPTIONS, draft.eventType);
  const datePreference = formatDatePreference(draft);
  const location = formatLocation(draft);
  const guests = formatGuests(draft);
  const budget = formatBudget(draft);
  const venueStyles = listLabels(VENUE_STYLE_OPTIONS, draft.venueStyles);
  const amenities = listLabels(AMENITY_REQUIREMENT_OPTIONS, draft.requiredAmenities);
  const services = listLabels(SERVICE_CATEGORY_OPTIONS, draft.servicesNeeded);

  return [
    {
      id: "event-basics",
      title: "Event basics",
      items: [
        {
          label: "Event type",
          value: display(eventType, "Choose an event type before saving."),
          isMissing: !eventType,
        },
      ],
    },
    {
      id: "date-location",
      title: "Date and location",
      items: [
        {
          label: "Date",
          value: display(datePreference, "Choose a date preference."),
          isMissing: !datePreference,
        },
        {
          label: "Location",
          value: display(
            location,
            "No preferred location yet. Venue results may stay broader.",
          ),
          isMissing: !location,
        },
        {
          label: "Nearby locations",
          value:
            draft.nearbyLocationsAllowed === null
              ? "Not specified"
              : draft.nearbyLocationsAllowed
                ? "Open to nearby locations"
                : "Only the selected location",
        },
      ],
    },
    {
      id: "guests-budget",
      title: "Guests and budget",
      items: [
        {
          label: "Guests",
          value: display(guests, "Add a guest count or range."),
          isMissing: !guests,
        },
        {
          label: "Budget",
          value: display(
            budget,
            "You have not selected an estimated budget. Later venue results may include a wider price range.",
          ),
          isMissing: !budget,
        },
      ],
    },
    {
      id: "venue-style",
      title: "Venue preferences",
      items: [
        {
          label: "Atmosphere",
          value: venueStyles.length
            ? venueStyles.join(", ")
            : "No atmosphere preference selected.",
          isMissing: venueStyles.length === 0,
        },
        {
          label: "Setting",
          value: display(
            labelFor(VENUE_SETTING_OPTIONS, draft.settingPreference),
            "Choose an indoor or outdoor preference.",
          ),
          isMissing: !draft.settingPreference,
        },
        {
          label: "Top priorities",
          value: formatPriorities(draft) || "No priority ranking yet.",
          isMissing: draft.rankedPriorities.length === 0,
        },
      ],
    },
    {
      id: "requirements",
      title: "Facilities and requirements",
      items: [
        {
          label: "Facilities",
          value: amenities.length
            ? amenities.join(", ")
            : "No required facilities selected.",
          isMissing: amenities.length === 0,
        },
        {
          label: "Additional requirements",
          value: display(
            draft.additionalRequirements,
            "No additional venue requirements.",
          ),
          isMissing: !draft.additionalRequirements,
        },
      ],
    },
    {
      id: "services",
      title: "Services",
      items: [
        {
          label: "Services needed",
          value: services.length ? services.join(", ") : "No service needs selected.",
          isMissing: services.length === 0,
        },
        {
          label: "Other service",
          value: display(draft.customService, "No custom service."),
          isMissing: !draft.customService,
        },
      ],
    },
    {
      id: "booking-preferences",
      title: "Booking preferences",
      items: [
        {
          label: "Payment preference",
          value: display(
            labelFor(PAYMENT_PREFERENCE_OPTIONS, draft.paymentPreference),
            "No payment preference selected.",
          ),
          isMissing: !draft.paymentPreference,
        },
        {
          label: "Booking urgency",
          value: display(
            labelFor(BOOKING_URGENCY_OPTIONS, draft.bookingUrgency),
            "No booking urgency selected.",
          ),
          isMissing: !draft.bookingUrgency,
        },
        {
          label: "Decision maker",
          value: display(
            labelFor(DECISION_MAKER_OPTIONS, draft.decisionMakerType),
            "No decision-maker preference selected.",
          ),
          isMissing: !draft.decisionMakerType,
        },
        {
          label: "Package preference",
          value: display(
            labelFor(PACKAGE_PREFERENCE_OPTIONS, draft.packagePreference),
            "No package preference selected.",
          ),
          isMissing: !draft.packagePreference,
        },
        {
          label: "Venue-accredited suppliers",
          value: display(
            labelFor(
              ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS,
              draft.accreditedSupplierPreference,
            ),
            "No supplier preference selected.",
          ),
          isMissing: !draft.accreditedSupplierPreference,
        },
      ],
    },
  ];
}

export function buildEventPlanTitle(draft: EventPlanDraft) {
  const eventType =
    draft.eventType === "other"
      ? draft.customEventType
      : labelFor(EVENT_TYPE_OPTIONS, draft.eventType);
  const location = formatLocation(draft);

  if (eventType && location) return `${eventType} in ${location}`;
  if (eventType) return `${eventType} event plan`;
  return "Event plan";
}
