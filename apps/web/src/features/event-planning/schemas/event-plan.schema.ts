import { z } from "zod";
import {
  getCitiesForProvince,
  getMunicipalitiesForProvince,
  LUZON_PROVINCE_NAMES,
} from "@/data/luzon-locations";
import {
  ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS,
  AMENITY_REQUIREMENT_OPTIONS,
  BOOKING_URGENCY_OPTIONS,
  BUDGET_PREFERENCE_OPTIONS,
  DATE_PREFERENCE_OPTIONS,
  DECISION_MAKER_OPTIONS,
  EVENT_PLAN_DRAFT_SCHEMA_VERSION,
  EVENT_PLAN_STATUS_OPTIONS,
  EVENT_PLANNING_STEPS,
  EVENT_TYPE_OPTIONS,
  GUEST_COUNT_RANGE_OPTIONS,
  MAX_ADDITIONAL_REQUIREMENTS_LENGTH,
  MAX_CUSTOM_EVENT_TYPE_LENGTH,
  MAX_CUSTOM_SERVICE_LENGTH,
  MAX_EXPECTED_GUEST_COUNT,
  MAX_RANKED_PRIORITIES,
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

function enumFromOptions<T extends string>(
  options: ReadonlyArray<{ value: T }>,
) {
  const values = options.map((option) => option.value);
  return z.enum(values as [T, ...T[]]);
}

function nullishTrimmedString(max: number, message: string) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.string().max(max, message).nullable());
}

function nullableNumber() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    return value;
  }, z.number().nullable());
}

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-");
  const year = Number(parts[0] ?? NaN);
  const month = Number(parts[1] ?? NaN);
  const day = Number(parts[2] ?? NaN);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function todayDateOnly(now = new Date()) {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTodayOrFutureDate(value: string) {
  return value >= todayDateOnly();
}

function nullableDateOnly() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    return value;
  }, z.string().refine(isDateOnly, "Choose a valid date").nullable());
}

function addIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string,
) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

const eventTypeSchema = enumFromOptions(EVENT_TYPE_OPTIONS);
const datePreferenceTypeSchema = enumFromOptions(DATE_PREFERENCE_OPTIONS);
const guestCountRangeSchema = enumFromOptions(GUEST_COUNT_RANGE_OPTIONS);
const budgetPreferenceSchema = enumFromOptions(BUDGET_PREFERENCE_OPTIONS);
const venueStyleSchema = enumFromOptions(VENUE_STYLE_OPTIONS);
const venueSettingSchema = enumFromOptions(VENUE_SETTING_OPTIONS);
const priorityFactorSchema = enumFromOptions(PRIORITY_FACTOR_OPTIONS);
const amenityRequirementSchema = enumFromOptions(AMENITY_REQUIREMENT_OPTIONS);
const serviceCategorySchema = enumFromOptions(SERVICE_CATEGORY_OPTIONS);
const packagePreferenceSchema = enumFromOptions(PACKAGE_PREFERENCE_OPTIONS);
const accreditedSupplierPreferenceSchema = enumFromOptions(
  ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS,
);
const paymentPreferenceSchema = enumFromOptions(PAYMENT_PREFERENCE_OPTIONS);
const bookingUrgencySchema = enumFromOptions(BOOKING_URGENCY_OPTIONS);
const decisionMakerSchema = enumFromOptions(DECISION_MAKER_OPTIONS);
const eventPlanStatusSchema = enumFromOptions(EVENT_PLAN_STATUS_OPTIONS);
const eventPlanningStepSchema = z.enum(
  EVENT_PLANNING_STEPS.map((step) => step.id) as [
    EventPlanningStep,
    ...EventPlanningStep[],
  ],
);

const nullableEventTypeSchema = eventTypeSchema.nullable();
const nullableDatePreferenceTypeSchema = datePreferenceTypeSchema.nullable();
const nullableGuestCountRangeSchema = guestCountRangeSchema.nullable();
const nullableBudgetPreferenceSchema = budgetPreferenceSchema.nullable();
const nullableVenueSettingSchema = venueSettingSchema.nullable();
const nullablePackagePreferenceSchema = packagePreferenceSchema.nullable();
const nullableAccreditedSupplierPreferenceSchema =
  accreditedSupplierPreferenceSchema.nullable();
const nullablePaymentPreferenceSchema = paymentPreferenceSchema.nullable();
const nullableBookingUrgencySchema = bookingUrgencySchema.nullable();
const nullableDecisionMakerSchema = decisionMakerSchema.nullable();

export const eventBasicsStepSchema = z
  .object({
    eventType: nullableEventTypeSchema,
    customEventType: nullishTrimmedString(
      MAX_CUSTOM_EVENT_TYPE_LENGTH,
      "Keep the custom event type under 80 characters",
    ),
  })
  .superRefine((input, ctx) => {
    if (!input.eventType) {
      addIssue(ctx, ["eventType"], "Choose an event type");
    }

    if (input.eventType === "other" && !input.customEventType) {
      addIssue(
        ctx,
        ["customEventType"],
        "Tell us what kind of event you are planning",
      );
    }

    if (
      input.eventType === "other" &&
      input.customEventType &&
      input.customEventType.length < 2
    ) {
      addIssue(
        ctx,
        ["customEventType"],
        "Tell us what kind of event you are planning",
      );
    }
  });

export const dateLocationStepSchema = z
  .object({
    datePreferenceType: nullableDatePreferenceTypeSchema,
    exactDate: nullableDateOnly(),
    preferredDateStart: nullableDateOnly(),
    preferredDateEnd: nullableDateOnly(),
    preferredMonth: z.number().int().min(1).max(12).nullable(),
    preferredYear: z.number().int().min(2026).max(2031).nullable(),
    preferredDayOfWeek: z
      .enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ])
      .nullable(),
    preferredTimeOfDay: z
      .enum(["morning", "afternoon", "evening", "whole-day"])
      .nullable(),
    preferredProvince: z
      .preprocess((value) => {
        if (value === "" || value === null || value === undefined) return null;
        return typeof value === "string" ? value.trim() : value;
      }, z.string().nullable())
      .refine(
        (value) => value === null || LUZON_PROVINCE_NAMES.includes(value),
        "Choose a supported province",
      ),
    preferredCity: nullishTrimmedString(120, "Choose a supported city"),
    nearbyLocationsAllowed: z.boolean().nullable(),
  })
  .superRefine((input, ctx) => {
    if (!input.datePreferenceType) {
      addIssue(ctx, ["datePreferenceType"], "Choose a date preference");
      return;
    }

    if (input.exactDate && !isTodayOrFutureDate(input.exactDate)) {
      addIssue(ctx, ["exactDate"], "Choose today or a future date");
    }

    if (
      input.preferredDateStart &&
      !isTodayOrFutureDate(input.preferredDateStart)
    ) {
      addIssue(ctx, ["preferredDateStart"], "Choose today or a future date");
    }

    if (input.datePreferenceType === "exact" && !input.exactDate) {
      addIssue(ctx, ["exactDate"], "Choose your event date");
    }

    if (input.datePreferenceType === "range") {
      if (!input.preferredDateStart) {
        addIssue(ctx, ["preferredDateStart"], "Choose the earliest date");
      }
      if (!input.preferredDateEnd) {
        addIssue(ctx, ["preferredDateEnd"], "Choose the latest date");
      }
      if (
        input.preferredDateStart &&
        input.preferredDateEnd &&
        input.preferredDateEnd < input.preferredDateStart
      ) {
        addIssue(
          ctx,
          ["preferredDateEnd"],
          "End date cannot be before start date",
        );
      }
    }

    if (input.datePreferenceType === "month") {
      if (!input.preferredMonth) {
        addIssue(ctx, ["preferredMonth"], "Choose a preferred month");
      }
      if (!input.preferredYear) {
        addIssue(ctx, ["preferredYear"], "Choose a preferred year");
      }
    }

    if (input.preferredCity && !input.preferredProvince) {
      addIssue(ctx, ["preferredProvince"], "Choose a province first");
    }

    if (input.preferredProvince && input.preferredCity) {
      const localities = [
        ...getCitiesForProvince(input.preferredProvince),
        ...getMunicipalitiesForProvince(input.preferredProvince),
      ];

      if (!localities.includes(input.preferredCity)) {
        addIssue(
          ctx,
          ["preferredCity"],
          "Choose a city or municipality inside the selected province",
        );
      }
    }
  });

export const guestsBudgetStepSchema = z
  .object({
    expectedGuestCount: nullableNumber(),
    guestCountRange: nullableGuestCountRangeSchema,
    budgetPreference: nullableBudgetPreferenceSchema,
    budgetMin: nullableNumber(),
    budgetMax: nullableNumber(),
    currency: z.literal("PHP"),
  })
  .superRefine((input, ctx) => {
    if (input.expectedGuestCount === null && input.guestCountRange === null) {
      addIssue(ctx, ["expectedGuestCount"], "Add a guest count or range");
    }

    if (input.expectedGuestCount !== null) {
      if (!Number.isInteger(input.expectedGuestCount)) {
        addIssue(
          ctx,
          ["expectedGuestCount"],
          "Guest count must be a whole number",
        );
      } else if (input.expectedGuestCount < 1) {
        addIssue(ctx, ["expectedGuestCount"], "Guest count must be at least 1");
      } else if (input.expectedGuestCount > MAX_EXPECTED_GUEST_COUNT) {
        addIssue(
          ctx,
          ["expectedGuestCount"],
          `Guest count must be ${MAX_EXPECTED_GUEST_COUNT} or less`,
        );
      }
    }

    for (const field of ["budgetMin", "budgetMax"] as const) {
      const value = input[field];
      if (value !== null) {
        if (!Number.isInteger(value)) {
          addIssue(ctx, [field], "Budget must be a whole peso amount");
        } else if (value < 0) {
          addIssue(ctx, [field], "Budget cannot be negative");
        }
      }
    }

    if (input.budgetPreference === "custom") {
      if (input.budgetMin === null) {
        addIssue(ctx, ["budgetMin"], "Add a minimum budget");
      }
      if (input.budgetMax === null) {
        addIssue(ctx, ["budgetMax"], "Add a maximum budget");
      }
    }

    if (
      input.budgetMin !== null &&
      input.budgetMax !== null &&
      input.budgetMax < input.budgetMin
    ) {
      addIssue(
        ctx,
        ["budgetMax"],
        "Maximum budget cannot be lower than minimum budget",
      );
    }

    if (
      (input.budgetPreference === "not-sure" ||
        input.budgetPreference === "prefer-not-to-say") &&
      (input.budgetMin !== null || input.budgetMax !== null)
    ) {
      addIssue(
        ctx,
        ["budgetPreference"],
        "Budget values must be empty for this budget preference",
      );
    }
  });

export const venueStyleStepSchema = z
  .object({
    venueStyles: z.array(venueStyleSchema),
    settingPreference: nullableVenueSettingSchema,
    rankedPriorities: z.array(priorityFactorSchema),
  })
  .superRefine((input, ctx) => {
    if (!input.settingPreference) {
      addIssue(ctx, ["settingPreference"], "Choose a venue setting");
    }
    if (hasDuplicates(input.venueStyles)) {
      addIssue(ctx, ["venueStyles"], "Venue styles cannot repeat");
    }
    if (input.rankedPriorities.length > MAX_RANKED_PRIORITIES) {
      addIssue(ctx, ["rankedPriorities"], "Choose up to three priorities");
    }
    if (hasDuplicates(input.rankedPriorities)) {
      addIssue(ctx, ["rankedPriorities"], "Priorities cannot repeat");
    }
  });

export const requirementsStepSchema = z
  .object({
    requiredAmenities: z.array(amenityRequirementSchema),
    additionalRequirements: nullishTrimmedString(
      MAX_ADDITIONAL_REQUIREMENTS_LENGTH,
      "Keep additional requirements under 500 characters",
    ),
  })
  .superRefine((input, ctx) => {
    if (hasDuplicates(input.requiredAmenities)) {
      addIssue(ctx, ["requiredAmenities"], "Required amenities cannot repeat");
    }
    if (
      input.requiredAmenities.includes("none") &&
      input.requiredAmenities.length > 1
    ) {
      addIssue(
        ctx,
        ["requiredAmenities"],
        "No specific requirements cannot be combined",
      );
    }
  });

export const servicesStepSchema = z
  .object({
    servicesNeeded: z.array(serviceCategorySchema),
    customService: nullishTrimmedString(
      MAX_CUSTOM_SERVICE_LENGTH,
      "Keep the custom service under 80 characters",
    ),
    serviceSelectionMode: z.enum(["needs-services", "already-complete"]),
  })
  .superRefine((input, ctx) => {
    if (hasDuplicates(input.servicesNeeded)) {
      addIssue(ctx, ["servicesNeeded"], "Services cannot repeat");
    }
    if (
      input.servicesNeeded.includes("already-have-all") &&
      input.servicesNeeded.length > 1
    ) {
      addIssue(
        ctx,
        ["servicesNeeded"],
        "I already have all suppliers cannot be combined",
      );
    }
    if (
      input.servicesNeeded.includes("already-have-all") &&
      input.serviceSelectionMode !== "already-complete"
    ) {
      addIssue(
        ctx,
        ["serviceSelectionMode"],
        "Use the already-complete service mode",
      );
    }
    if (input.servicesNeeded.includes("other") && !input.customService) {
      addIssue(ctx, ["customService"], "Describe the other service");
    }
    if (
      input.servicesNeeded.includes("other") &&
      input.customService &&
      input.customService.length < 2
    ) {
      addIssue(ctx, ["customService"], "Describe the other service");
    }
  });

export const bookingPreferencesStepSchema = z.object({
  packagePreference: nullablePackagePreferenceSchema,
  accreditedSupplierPreference: nullableAccreditedSupplierPreferenceSchema,
  paymentPreference: nullablePaymentPreferenceSchema,
  bookingUrgency: nullableBookingUrgencySchema,
  decisionMakerType: nullableDecisionMakerSchema,
});

export const eventPlanDraftSchema = z
  .object({
    schemaVersion: z.literal(EVENT_PLAN_DRAFT_SCHEMA_VERSION),
    currentStep: eventPlanningStepSchema,
    eventType: nullableEventTypeSchema,
    customEventType: nullishTrimmedString(
      MAX_CUSTOM_EVENT_TYPE_LENGTH,
      "Keep the custom event type under 80 characters",
    ),
    datePreferenceType: nullableDatePreferenceTypeSchema,
    exactDate: nullableDateOnly(),
    preferredDateStart: nullableDateOnly(),
    preferredDateEnd: nullableDateOnly(),
    preferredMonth: z.number().int().min(1).max(12).nullable(),
    preferredYear: z.number().int().min(2026).max(2031).nullable(),
    preferredDayOfWeek: z
      .enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ])
      .nullable(),
    preferredTimeOfDay: z
      .enum(["morning", "afternoon", "evening", "whole-day"])
      .nullable(),
    preferredProvince: z
      .preprocess((value) => {
        if (value === "" || value === null || value === undefined) return null;
        return typeof value === "string" ? value.trim() : value;
      }, z.string().nullable())
      .refine(
        (value) => value === null || LUZON_PROVINCE_NAMES.includes(value),
        "Choose a supported province",
      ),
    preferredCity: nullishTrimmedString(120, "Choose a supported city"),
    nearbyLocationsAllowed: z.boolean().nullable(),
    expectedGuestCount: nullableNumber(),
    guestCountRange: nullableGuestCountRangeSchema,
    budgetMin: nullableNumber(),
    budgetMax: nullableNumber(),
    budgetPreference: nullableBudgetPreferenceSchema,
    currency: z.literal("PHP"),
    venueStyles: z.array(venueStyleSchema),
    settingPreference: nullableVenueSettingSchema,
    rankedPriorities: z.array(priorityFactorSchema).max(MAX_RANKED_PRIORITIES),
    requiredAmenities: z.array(amenityRequirementSchema),
    additionalRequirements: nullishTrimmedString(
      MAX_ADDITIONAL_REQUIREMENTS_LENGTH,
      "Keep additional requirements under 500 characters",
    ),
    servicesNeeded: z.array(serviceCategorySchema),
    customService: nullishTrimmedString(
      MAX_CUSTOM_SERVICE_LENGTH,
      "Keep the custom service under 80 characters",
    ),
    serviceSelectionMode: z.enum(["needs-services", "already-complete"]),
    packagePreference: nullablePackagePreferenceSchema,
    accreditedSupplierPreference: nullableAccreditedSupplierPreferenceSchema,
    paymentPreference: nullablePaymentPreferenceSchema,
    bookingUrgency: nullableBookingUrgencySchema,
    decisionMakerType: nullableDecisionMakerSchema,
    completedSteps: z.array(eventPlanningStepSchema),
    updatedAt: z
      .string()
      .datetime("Draft timestamp must be an ISO datetime string"),
  })
  .superRefine((input, ctx) => {
    if (hasDuplicates(input.rankedPriorities)) {
      addIssue(ctx, ["rankedPriorities"], "Priorities cannot repeat");
    }
    if (hasDuplicates(input.requiredAmenities)) {
      addIssue(ctx, ["requiredAmenities"], "Required amenities cannot repeat");
    }
    if (hasDuplicates(input.servicesNeeded)) {
      addIssue(ctx, ["servicesNeeded"], "Services cannot repeat");
    }
    if (hasDuplicates(input.completedSteps)) {
      addIssue(ctx, ["completedSteps"], "Completed steps cannot repeat");
    }
  });

export const eventPlanPersistenceSchema = eventPlanDraftSchema.superRefine(
  (input, ctx) => {
    const eventBasics = eventBasicsStepSchema.safeParse(input);
    if (!eventBasics.success) {
      addIssue(ctx, ["eventType"], "Complete event basics before saving");
    }

    if (!input.datePreferenceType) {
      addIssue(ctx, ["datePreferenceType"], "Choose a date preference");
    }
  },
);

export const eventPlanSearchMappingSchema = eventPlanDraftSchema;

export type EventBasicsStepInput = z.infer<typeof eventBasicsStepSchema>;
export type DateLocationStepInput = z.infer<typeof dateLocationStepSchema>;
export type GuestsBudgetStepInput = z.infer<typeof guestsBudgetStepSchema>;
export type VenueStyleStepInput = z.infer<typeof venueStyleStepSchema>;
export type RequirementsStepInput = z.infer<typeof requirementsStepSchema>;
export type ServicesStepInput = z.infer<typeof servicesStepSchema>;
export type BookingPreferencesStepInput = z.infer<
  typeof bookingPreferencesStepSchema
>;
export type EventPlanPersistenceInput = z.infer<
  typeof eventPlanPersistenceSchema
>;

export { eventPlanStatusSchema };
