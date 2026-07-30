import type {
  AccreditedSupplierPreference,
  AmenityRequirement,
  BookingUrgency,
  BudgetPreference,
  DatePreferenceType,
  DecisionMakerType,
  EventPlanDraft,
  EventPlanStatus,
  EventPlanningStep,
  EventType,
  GuestCountRange,
  PackagePreference,
  PaymentPreference,
  PriorityFactor,
  ServiceCategory,
  VenueSettingPreference,
  VenueStyle,
} from "./event-plan.types";

type LookupOption<T extends string> = {
  value: T;
  label: string;
  databaseName?: string | null;
};

type StepOption<T extends string> = {
  id: T;
  label: string;
};

export const EVENT_PLAN_DRAFT_SCHEMA_VERSION = 1 as const;
export const EVENT_PLAN_DRAFT_STORAGE_KEY = "venora:event-plan-draft:v1";
export const EVENT_PLAN_DRAFT_EXPIRATION_DAYS = 30;
export const MAX_EXPECTED_GUEST_COUNT = 5000;
export const MAX_CUSTOM_EVENT_TYPE_LENGTH = 80;
export const MAX_CUSTOM_SERVICE_LENGTH = 80;
export const MAX_ADDITIONAL_REQUIREMENTS_LENGTH = 500;
export const MAX_RANKED_PRIORITIES = 3;

export const EVENT_PLANNING_STEPS = [
  { id: "event-basics", label: "Event Basics" },
  { id: "date-location", label: "Date and Location" },
  { id: "guests-budget", label: "Guests and Budget" },
  { id: "venue-style", label: "Venue Style" },
  { id: "requirements", label: "Facilities and Requirements" },
  { id: "services", label: "Services Needed" },
  { id: "booking-preferences", label: "Booking Preferences" },
  { id: "summary", label: "Event Plan Summary" },
] as const satisfies readonly StepOption<EventPlanningStep>[];

export const EVENT_TYPE_OPTIONS = [
  { value: "wedding", label: "Wedding", databaseName: "Wedding" },
  { value: "birthday", label: "Birthday", databaseName: "Birthday" },
  {
    value: "corporate",
    label: "Corporate event",
    databaseName: "Corporate",
  },
  { value: "debut", label: "Debut", databaseName: "Debut" },
  { value: "graduation", label: "Graduation", databaseName: "Graduation" },
  { value: "reunion", label: "Reunion", databaseName: "Reunion" },
  { value: "conference", label: "Conference", databaseName: "Conference" },
  { value: "seminar", label: "Seminar", databaseName: "Seminar" },
  {
    value: "product-launch",
    label: "Product launch",
    databaseName: "Product Launch",
  },
  { value: "other", label: "Other", databaseName: "Other" },
] as const satisfies readonly LookupOption<EventType>[];

export const DATE_PREFERENCE_OPTIONS = [
  { value: "exact", label: "I have an exact date" },
  { value: "range", label: "I have a preferred date range" },
  { value: "month", label: "I only know the month" },
  { value: "flexible", label: "My date is flexible" },
  { value: "not-sure", label: "I am not sure yet" },
] as const satisfies readonly LookupOption<DatePreferenceType>[];

export const GUEST_COUNT_RANGE_OPTIONS = [
  { value: "under-50", label: "Fewer than 50" },
  { value: "50-100", label: "50-100" },
  { value: "101-150", label: "101-150" },
  { value: "151-200", label: "151-200" },
  { value: "201-300", label: "201-300" },
  { value: "over-300", label: "More than 300" },
  { value: "not-sure", label: "Not sure yet" },
] as const satisfies readonly LookupOption<GuestCountRange>[];

export const BUDGET_PREFERENCE_OPTIONS = [
  { value: "under-50000", label: "Under PHP 50,000" },
  { value: "50000-100000", label: "PHP 50,000-PHP 100,000" },
  { value: "100001-250000", label: "PHP 100,001-PHP 250,000" },
  { value: "250001-500000", label: "PHP 250,001-PHP 500,000" },
  { value: "above-500000", label: "Above PHP 500,000" },
  { value: "not-sure", label: "Not sure yet" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
  { value: "custom", label: "Use a custom range" },
] as const satisfies readonly LookupOption<BudgetPreference>[];

export const VENUE_STYLE_OPTIONS = [
  { value: "elegant", label: "Elegant", databaseName: null },
  { value: "romantic", label: "Romantic", databaseName: null },
  { value: "modern", label: "Modern", databaseName: null },
  { value: "minimalist", label: "Minimalist", databaseName: null },
  { value: "rustic", label: "Rustic", databaseName: null },
  { value: "garden", label: "Garden", databaseName: "Garden" },
  { value: "beach", label: "Beach", databaseName: "Beach" },
  { value: "intimate", label: "Intimate", databaseName: null },
  { value: "luxurious", label: "Luxurious", databaseName: null },
  { value: "traditional", label: "Traditional", databaseName: null },
  { value: "industrial", label: "Industrial", databaseName: null },
  { value: "family-friendly", label: "Family-friendly", databaseName: null },
  {
    value: "corporate-professional",
    label: "Corporate or professional",
    databaseName: null,
  },
  { value: "resort", label: "Resort", databaseName: "Resort" },
  {
    value: "hotel-ballroom",
    label: "Hotel ballroom",
    databaseName: "Hotel Ballroom",
  },
  { value: "restaurant", label: "Restaurant", databaseName: "Restaurant" },
  { value: "function-hall", label: "Function hall", databaseName: "Function Hall" },
  { value: "church", label: "Church", databaseName: "Church" },
  { value: "events-space", label: "Events space", databaseName: "Events Space" },
  { value: "rooftop", label: "Rooftop", databaseName: "Rooftop" },
  { value: "farm", label: "Farm", databaseName: "Farm" },
  { value: "no-preference", label: "No preference", databaseName: null },
] as const satisfies readonly LookupOption<VenueStyle>[];

export const VENUE_SETTING_OPTIONS = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "both", label: "Both indoor and outdoor" },
  { value: "no-preference", label: "No preference" },
] as const satisfies readonly LookupOption<VenueSettingPreference>[];

export const PRIORITY_FACTOR_OPTIONS = [
  { value: "location", label: "Location" },
  { value: "budget", label: "Budget" },
  { value: "appearance", label: "Venue appearance" },
  { value: "capacity", label: "Guest capacity" },
  { value: "complete-package", label: "Complete package availability" },
  { value: "accessibility", label: "Accessibility" },
  { value: "parking", label: "Parking" },
  { value: "accredited-suppliers", label: "Accredited suppliers" },
  { value: "reviews", label: "Reviews" },
  { value: "flexible-payment", label: "Flexible payment terms" },
  { value: "accommodation", label: "Accommodation" },
  { value: "privacy", label: "Privacy or exclusivity" },
] as const satisfies readonly LookupOption<PriorityFactor>[];

export const AMENITY_REQUIREMENT_OPTIONS = [
  { value: "parking", label: "Parking", databaseName: "Parking" },
  {
    value: "air-conditioning",
    label: "Air conditioning",
    databaseName: "Air Conditioning",
  },
  {
    value: "accessible-entrance",
    label: "Accessible entrance",
    databaseName: "Wheelchair Ramp",
  },
  {
    value: "accessible-restroom",
    label: "Accessible restroom",
    databaseName: null,
  },
  {
    value: "preparation-room",
    label: "Dressing or preparation room",
    databaseName: "Bridal Suite",
  },
  { value: "stage", label: "Stage", databaseName: "Stage" },
  {
    value: "sound-system",
    label: "Sound system",
    databaseName: "Sound System",
  },
  { value: "lighting", label: "Lighting equipment", databaseName: null },
  { value: "kitchen", label: "Kitchen", databaseName: "Catering Kitchen" },
  {
    value: "catering-prep",
    label: "Catering preparation area",
    databaseName: "Catering Kitchen",
  },
  {
    value: "accommodation",
    label: "Accommodation",
    databaseName: "Overnight Accommodation",
  },
  { value: "ceremony-area", label: "Ceremony area", databaseName: "Garden Area" },
  { value: "reception-area", label: "Reception area", databaseName: null },
  { value: "backup-indoor-space", label: "Backup indoor space", databaseName: null },
  { value: "wifi", label: "Wi-Fi", databaseName: "Wi-Fi" },
  { value: "generator", label: "Generator or backup power", databaseName: "Backup Generator" },
  {
    value: "pet-friendly",
    label: "Pet-friendly venue",
    databaseName: "Pet Friendly Area",
  },
  { value: "none", label: "No specific requirements", databaseName: null },
] as const satisfies readonly LookupOption<AmenityRequirement>[];

export const SERVICE_CATEGORY_OPTIONS = [
  { value: "catering", label: "Catering", databaseName: "Catering" },
  { value: "photography", label: "Photography", databaseName: "Photography" },
  { value: "videography", label: "Videography", databaseName: "Videography" },
  {
    value: "event-coordination",
    label: "Event coordination",
    databaseName: "Event Coordination",
  },
  {
    value: "styling",
    label: "Styling and decoration",
    databaseName: "Floral & Styling",
  },
  {
    value: "lights-sounds",
    label: "Lights and sounds",
    databaseName: "Lights & Sounds",
  },
  { value: "host-emcee", label: "Host or emcee", databaseName: null },
  { value: "entertainment", label: "Entertainment", databaseName: "Entertainment" },
  {
    value: "cake-desserts",
    label: "Cake and desserts",
    databaseName: "Cake & Desserts",
  },
  {
    value: "hair-makeup",
    label: "Hair and makeup",
    databaseName: "Hair & Makeup",
  },
  {
    value: "transportation",
    label: "Transportation",
    databaseName: "Transportation",
  },
  { value: "photo-booth", label: "Photo booth", databaseName: "Photo Booth" },
  { value: "other", label: "Other", databaseName: "Other" },
  {
    value: "already-have-all",
    label: "I already have all my suppliers",
    databaseName: null,
  },
] as const satisfies readonly LookupOption<ServiceCategory>[];

export const PACKAGE_PREFERENCE_OPTIONS = [
  { value: "complete-package", label: "Complete venue package" },
  { value: "individual-services", label: "Choose each service individually" },
  { value: "compare-both", label: "Compare both options" },
  { value: "not-sure", label: "Not sure yet" },
] as const satisfies readonly LookupOption<PackagePreference>[];

export const ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "maybe", label: "Maybe" },
  {
    value: "already-have-preferred",
    label: "I already have preferred suppliers",
  },
] as const satisfies readonly LookupOption<AccreditedSupplierPreference>[];

export const PAYMENT_PREFERENCE_OPTIONS = [
  { value: "deposit-balance", label: "Deposit followed by remaining balance" },
  { value: "full-payment", label: "Full payment" },
  { value: "no-preference", label: "No preference" },
] as const satisfies readonly LookupOption<PaymentPreference>[];

export const BOOKING_URGENCY_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "within-1-month", label: "Within 1 month" },
  { value: "within-1-3-months", label: "Within 1-3 months" },
  { value: "over-3-months", label: "More than 3 months from now" },
  { value: "exploring", label: "I am still exploring" },
] as const satisfies readonly LookupOption<BookingUrgency>[];

export const DECISION_MAKER_OPTIONS = [
  { value: "self", label: "I will decide" },
  { value: "partner-family", label: "Partner or family member" },
  { value: "company-organization", label: "Company or organization" },
  { value: "event-coordinator", label: "Event coordinator" },
  { value: "other", label: "Other" },
] as const satisfies readonly LookupOption<DecisionMakerType>[];

export const EVENT_PLAN_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
  { value: "converted_to_inquiry", label: "Converted to inquiry" },
  { value: "converted_to_booking", label: "Converted to booking" },
] as const satisfies readonly LookupOption<EventPlanStatus>[];

export function createDefaultEventPlanDraft(
  updatedAt = new Date().toISOString(),
): EventPlanDraft {
  return {
    schemaVersion: EVENT_PLAN_DRAFT_SCHEMA_VERSION,
    currentStep: "event-basics",
    eventType: null,
    customEventType: null,
    datePreferenceType: null,
    exactDate: null,
    preferredDateStart: null,
    preferredDateEnd: null,
    preferredMonth: null,
    preferredYear: null,
    preferredDayOfWeek: null,
    preferredTimeOfDay: null,
    preferredProvince: null,
    preferredCity: null,
    nearbyLocationsAllowed: null,
    expectedGuestCount: null,
    guestCountRange: null,
    budgetMin: null,
    budgetMax: null,
    budgetPreference: null,
    currency: "PHP",
    venueStyles: [],
    settingPreference: null,
    rankedPriorities: [],
    requiredAmenities: [],
    additionalRequirements: null,
    servicesNeeded: [],
    customService: null,
    serviceSelectionMode: "needs-services",
    packagePreference: null,
    accreditedSupplierPreference: null,
    paymentPreference: null,
    bookingUrgency: null,
    decisionMakerType: null,
    completedSteps: [],
    updatedAt,
  };
}
