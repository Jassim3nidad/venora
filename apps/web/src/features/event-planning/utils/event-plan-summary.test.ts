import { describe, expect, it } from "vitest";
import { createDefaultEventPlanDraft } from "../domain/event-plan.constants";
import type { EventPlanDraft } from "../domain/event-plan.types";
import {
  buildEventPlanSummarySections,
  buildEventPlanTitle,
} from "./event-plan-summary";

describe("event plan summary", () => {
  it("renders real answers from the draft", () => {
    const draft: EventPlanDraft = {
      ...createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z"),
      eventType: "wedding" as const,
      datePreferenceType: "range" as const,
      preferredDateStart: "2099-12-01",
      preferredDateEnd: "2099-12-03",
      preferredProvince: "Cavite",
      preferredCity: "Tagaytay",
      nearbyLocationsAllowed: true,
      expectedGuestCount: 150,
      budgetPreference: "custom" as const,
      budgetMin: 80000,
      budgetMax: 150000,
      venueStyles: ["garden", "romantic"],
      settingPreference: "both" as const,
      rankedPriorities: ["location", "budget"],
      requiredAmenities: ["parking", "wifi"],
      servicesNeeded: ["catering", "photography"],
      packagePreference: "compare-both" as const,
      accreditedSupplierPreference: "maybe" as const,
      paymentPreference: "deposit-balance" as const,
      bookingUrgency: "within-1-month" as const,
      decisionMakerType: "partner-family" as const,
    };

    expect(buildEventPlanTitle(draft)).toBe("Wedding in Tagaytay, Cavite");
    const sections = buildEventPlanSummarySections(draft);
    const rendered = JSON.stringify(sections);

    expect(rendered).toContain(
      "I have a preferred date range: 2099-12-01 to 2099-12-03",
    );
    expect(rendered).toContain("Tagaytay, Cavite");
    expect(rendered).toContain("150 guests");
    expect(rendered).toContain("Garden, Romantic");
    expect(rendered).toContain("1. Location; 2. Budget");
    expect(rendered).toContain("Deposit followed by remaining balance");
  });

  it("shows optional omissions as guidance instead of fake recommendations", () => {
    const draft: EventPlanDraft = {
      ...createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z"),
      eventType: "birthday" as const,
      datePreferenceType: "not-sure" as const,
      guestCountRange: "not-sure" as const,
    };

    const rendered = JSON.stringify(buildEventPlanSummarySections(draft));

    expect(rendered).toContain("You have not selected an estimated budget");
    expect(rendered).not.toMatch(/match|recommended venue|supplier card/i);
  });
});
