export type EventPlanningStep =
  | "event-basics"
  | "date-location"
  | "guests-budget"
  | "venue-style"
  | "requirements"
  | "services"
  | "booking-preferences"
  | "summary";

export type EventType =
  | "wedding"
  | "birthday"
  | "corporate"
  | "debut"
  | "graduation"
  | "reunion"
  | "conference"
  | "seminar"
  | "product-launch"
  | "other";

export type DatePreferenceType =
  | "exact"
  | "range"
  | "month"
  | "flexible"
  | "not-sure";

export type DayOfWeekPreference =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type TimeOfDayPreference =
  | "morning"
  | "afternoon"
  | "evening"
  | "whole-day";

export type GuestCountRange =
  | "under-50"
  | "50-100"
  | "101-150"
  | "151-200"
  | "201-300"
  | "over-300"
  | "not-sure";

export type BudgetPreference =
  | "under-50000"
  | "50000-100000"
  | "100001-250000"
  | "250001-500000"
  | "above-500000"
  | "not-sure"
  | "prefer-not-to-say"
  | "custom";

export type VenueStyle =
  | "elegant"
  | "romantic"
  | "modern"
  | "minimalist"
  | "rustic"
  | "garden"
  | "beach"
  | "intimate"
  | "luxurious"
  | "traditional"
  | "industrial"
  | "family-friendly"
  | "corporate-professional"
  | "resort"
  | "hotel-ballroom"
  | "restaurant"
  | "function-hall"
  | "church"
  | "events-space"
  | "rooftop"
  | "farm"
  | "no-preference";

export type VenueSettingPreference =
  | "indoor"
  | "outdoor"
  | "both"
  | "no-preference";

export type PriorityFactor =
  | "location"
  | "budget"
  | "appearance"
  | "capacity"
  | "complete-package"
  | "accessibility"
  | "parking"
  | "accredited-suppliers"
  | "reviews"
  | "flexible-payment"
  | "accommodation"
  | "privacy";

export type AmenityRequirement =
  | "parking"
  | "air-conditioning"
  | "accessible-entrance"
  | "accessible-restroom"
  | "preparation-room"
  | "stage"
  | "sound-system"
  | "lighting"
  | "kitchen"
  | "catering-prep"
  | "accommodation"
  | "ceremony-area"
  | "reception-area"
  | "backup-indoor-space"
  | "wifi"
  | "generator"
  | "pet-friendly"
  | "none";

export type ServiceCategory =
  | "catering"
  | "photography"
  | "videography"
  | "event-coordination"
  | "styling"
  | "lights-sounds"
  | "host-emcee"
  | "entertainment"
  | "cake-desserts"
  | "hair-makeup"
  | "transportation"
  | "photo-booth"
  | "other"
  | "already-have-all";

export type ServiceSelectionMode = "needs-services" | "already-complete";

export type PackagePreference =
  | "complete-package"
  | "individual-services"
  | "compare-both"
  | "not-sure";

export type AccreditedSupplierPreference =
  | "yes"
  | "no"
  | "maybe"
  | "already-have-preferred";

export type PaymentPreference =
  | "deposit-balance"
  | "full-payment"
  | "no-preference";

export type BookingUrgency =
  | "asap"
  | "within-1-month"
  | "within-1-3-months"
  | "over-3-months"
  | "exploring";

export type DecisionMakerType =
  | "self"
  | "partner-family"
  | "company-organization"
  | "event-coordinator"
  | "other";

export type EventPlanStatus =
  | "draft"
  | "completed"
  | "archived"
  | "converted_to_inquiry"
  | "converted_to_booking";

export type EventPlanDraft = {
  schemaVersion: 1;
  currentStep: EventPlanningStep;
  eventType: EventType | null;
  customEventType: string | null;
  datePreferenceType: DatePreferenceType | null;
  exactDate: string | null;
  preferredDateStart: string | null;
  preferredDateEnd: string | null;
  preferredMonth: number | null;
  preferredYear: number | null;
  preferredDayOfWeek: DayOfWeekPreference | null;
  preferredTimeOfDay: TimeOfDayPreference | null;
  preferredProvince: string | null;
  preferredCity: string | null;
  nearbyLocationsAllowed: boolean | null;
  expectedGuestCount: number | null;
  guestCountRange: GuestCountRange | null;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetPreference: BudgetPreference | null;
  currency: "PHP";
  venueStyles: VenueStyle[];
  settingPreference: VenueSettingPreference | null;
  rankedPriorities: PriorityFactor[];
  requiredAmenities: AmenityRequirement[];
  additionalRequirements: string | null;
  servicesNeeded: ServiceCategory[];
  customService: string | null;
  serviceSelectionMode: ServiceSelectionMode;
  packagePreference: PackagePreference | null;
  accreditedSupplierPreference: AccreditedSupplierPreference | null;
  paymentPreference: PaymentPreference | null;
  bookingUrgency: BookingUrgency | null;
  decisionMakerType: DecisionMakerType | null;
  completedSteps: EventPlanningStep[];
  updatedAt: string;
};

export type PersistedEventPlan = EventPlanDraft & {
  id: string;
  customerId: string;
  title: string;
  status: EventPlanStatus;
  createdAt: string;
  archivedAt: string | null;
};

export type EventPlanActionResult<T = undefined> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };
