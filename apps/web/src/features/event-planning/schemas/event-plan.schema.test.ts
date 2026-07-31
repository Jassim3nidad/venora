import { describe, expect, it } from "vitest";
import {
  bookingPreferencesStepSchema,
  dateLocationStepSchema,
  eventBasicsStepSchema,
  eventPlanDraftSchema,
  eventPlanPersistenceSchema,
  eventPlanSearchMappingSchema,
  guestsBudgetStepSchema,
  requirementsStepSchema,
  servicesStepSchema,
  venueStyleStepSchema,
} from "./event-plan.schema";
import { createDefaultEventPlanDraft } from "../domain/event-plan.constants";

const validFutureDate = "2099-12-01";

describe("event plan validation schemas", () => {
  it("validates event basics and trims custom event types", () => {
    expect(
      eventBasicsStepSchema.parse({
        eventType: "other",
        customEventType: "  Awards night  ",
      }),
    ).toEqual({
      eventType: "other",
      customEventType: "Awards night",
    });

    expect(() =>
      eventBasicsStepSchema.parse({
        eventType: null,
        customEventType: null,
      }),
    ).toThrow("Choose an event type");

    expect(() =>
      eventBasicsStepSchema.parse({
        eventType: "other",
        customEventType: " ",
      }),
    ).toThrow("Tell us what kind of event you are planning");

    expect(() =>
      eventBasicsStepSchema.parse({
        eventType: "other",
        customEventType: "A".repeat(81),
      }),
    ).toThrow("Keep the custom event type under 80 characters");
  });

  it("validates date modes and province/city relationships", () => {
    expect(
      dateLocationStepSchema.parse({
        datePreferenceType: "exact",
        exactDate: validFutureDate,
        preferredDateStart: null,
        preferredDateEnd: null,
        preferredMonth: null,
        preferredYear: null,
        preferredDayOfWeek: null,
        preferredTimeOfDay: null,
        preferredProvince: "Cavite",
        preferredCity: "Tagaytay",
        nearbyLocationsAllowed: true,
      }),
    ).toMatchObject({
      datePreferenceType: "exact",
      exactDate: validFutureDate,
      preferredProvince: "Cavite",
      preferredCity: "Tagaytay",
    });

    expect(() =>
      dateLocationStepSchema.parse({
        datePreferenceType: "range",
        exactDate: null,
        preferredDateStart: "2099-12-10",
        preferredDateEnd: "2099-12-01",
        preferredMonth: null,
        preferredYear: null,
        preferredDayOfWeek: null,
        preferredTimeOfDay: null,
        preferredProvince: null,
        preferredCity: null,
        nearbyLocationsAllowed: null,
      }),
    ).toThrow("End date cannot be before start date");

    expect(() =>
      dateLocationStepSchema.parse({
        datePreferenceType: "month",
        exactDate: null,
        preferredDateStart: null,
        preferredDateEnd: null,
        preferredMonth: 13,
        preferredYear: 2099,
        preferredDayOfWeek: null,
        preferredTimeOfDay: null,
        preferredProvince: null,
        preferredCity: null,
        nearbyLocationsAllowed: null,
      }),
    ).toThrow();

    expect(() =>
      dateLocationStepSchema.parse({
        datePreferenceType: "exact",
        exactDate: validFutureDate,
        preferredDateStart: null,
        preferredDateEnd: null,
        preferredMonth: null,
        preferredYear: null,
        preferredDayOfWeek: null,
        preferredTimeOfDay: null,
        preferredProvince: "Cavite",
        preferredCity: "Baguio",
        nearbyLocationsAllowed: null,
      }),
    ).toThrow("Choose a city or municipality inside the selected province");
  });

  it("validates guest count and budget boundaries", () => {
    expect(
      guestsBudgetStepSchema.parse({
        expectedGuestCount: 120,
        guestCountRange: null,
        budgetPreference: "custom",
        budgetMin: 100000,
        budgetMax: 250000,
        currency: "PHP",
      }),
    ).toMatchObject({
      expectedGuestCount: 120,
      budgetMin: 100000,
      budgetMax: 250000,
    });

    expect(() =>
      guestsBudgetStepSchema.parse({
        expectedGuestCount: -1,
        guestCountRange: null,
        budgetPreference: null,
        budgetMin: null,
        budgetMax: null,
        currency: "PHP",
      }),
    ).toThrow("Guest count must be at least 1");

    expect(() =>
      guestsBudgetStepSchema.parse({
        expectedGuestCount: 12.5,
        guestCountRange: null,
        budgetPreference: null,
        budgetMin: null,
        budgetMax: null,
        currency: "PHP",
      }),
    ).toThrow("Guest count must be a whole number");

    expect(() =>
      guestsBudgetStepSchema.parse({
        expectedGuestCount: 120,
        guestCountRange: null,
        budgetPreference: "custom",
        budgetMin: 250000,
        budgetMax: 100000,
        currency: "PHP",
      }),
    ).toThrow("Maximum budget cannot be lower than minimum budget");
  });

  it("validates venue style selections and priority ordering", () => {
    expect(
      venueStyleStepSchema.parse({
        venueStyles: ["garden", "romantic"],
        settingPreference: "both",
        rankedPriorities: ["location", "budget", "parking"],
      }),
    ).toEqual({
      venueStyles: ["garden", "romantic"],
      settingPreference: "both",
      rankedPriorities: ["location", "budget", "parking"],
    });

    expect(() =>
      venueStyleStepSchema.parse({
        venueStyles: ["invalid-style"],
        settingPreference: "both",
        rankedPriorities: [],
      }),
    ).toThrow();

    expect(() =>
      venueStyleStepSchema.parse({
        venueStyles: ["garden"],
        settingPreference: "both",
        rankedPriorities: ["location", "budget", "parking", "reviews"],
      }),
    ).toThrow("Choose up to three priorities");

    expect(() =>
      venueStyleStepSchema.parse({
        venueStyles: ["garden"],
        settingPreference: "both",
        rankedPriorities: ["location", "location"],
      }),
    ).toThrow("Priorities cannot repeat");
  });

  it("validates facilities and additional requirements", () => {
    expect(
      requirementsStepSchema.parse({
        requiredAmenities: ["parking", "wifi"],
        additionalRequirements: "  Please provide standby power.  ",
      }),
    ).toEqual({
      requiredAmenities: ["parking", "wifi"],
      additionalRequirements: "Please provide standby power.",
    });

    expect(() =>
      requirementsStepSchema.parse({
        requiredAmenities: ["invalid-amenity"],
        additionalRequirements: null,
      }),
    ).toThrow();

    expect(() =>
      requirementsStepSchema.parse({
        requiredAmenities: ["none", "parking"],
        additionalRequirements: null,
      }),
    ).toThrow("No specific requirements cannot be combined");

    expect(() =>
      requirementsStepSchema.parse({
        requiredAmenities: [],
        additionalRequirements: "A".repeat(501),
      }),
    ).toThrow("Keep additional requirements under 500 characters");
  });

  it("validates services and exclusive supplier selection", () => {
    expect(
      servicesStepSchema.parse({
        servicesNeeded: ["catering", "photography"],
        customService: null,
        serviceSelectionMode: "needs-services",
      }),
    ).toEqual({
      servicesNeeded: ["catering", "photography"],
      customService: null,
      serviceSelectionMode: "needs-services",
    });

    expect(() =>
      servicesStepSchema.parse({
        servicesNeeded: ["invalid-service"],
        customService: null,
        serviceSelectionMode: "needs-services",
      }),
    ).toThrow();

    expect(() =>
      servicesStepSchema.parse({
        servicesNeeded: ["already-have-all", "catering"],
        customService: null,
        serviceSelectionMode: "already-complete",
      }),
    ).toThrow("I already have all suppliers cannot be combined");

    expect(() =>
      servicesStepSchema.parse({
        servicesNeeded: ["other"],
        customService: "",
        serviceSelectionMode: "needs-services",
      }),
    ).toThrow("Describe the other service");
  });

  it("validates booking preferences", () => {
    expect(
      bookingPreferencesStepSchema.parse({
        packagePreference: "compare-both",
        accreditedSupplierPreference: "maybe",
        paymentPreference: "deposit-balance",
        bookingUrgency: "within-1-3-months",
        decisionMakerType: "partner-family",
      }),
    ).toMatchObject({
      packagePreference: "compare-both",
      paymentPreference: "deposit-balance",
    });

    expect(() =>
      bookingPreferencesStepSchema.parse({
        packagePreference: "compare-both",
        accreditedSupplierPreference: "maybe",
        paymentPreference: "installments",
        bookingUrgency: "within-1-3-months",
        decisionMakerType: "partner-family",
      }),
    ).toThrow();
  });

  it("validates restored drafts and rejects invalid schema versions", () => {
    const draft = createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z");

    expect(eventPlanDraftSchema.parse(draft)).toEqual(draft);
    expect(() =>
      eventPlanDraftSchema.parse({ ...draft, schemaVersion: 2 }),
    ).toThrow();
    expect(() => eventPlanDraftSchema.parse("not an object")).toThrow();
  });

  it("revalidates full persistence input and search mapping input", () => {
    const draft = {
      ...createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z"),
      eventType: "wedding",
      datePreferenceType: "exact",
      exactDate: validFutureDate,
      currentStep: "summary",
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

    expect(eventPlanPersistenceSchema.parse(draft)).toMatchObject({
      eventType: "wedding",
      datePreferenceType: "exact",
    });
    expect(eventPlanSearchMappingSchema.parse(draft)).toMatchObject({
      eventType: "wedding",
    });
  });
});
