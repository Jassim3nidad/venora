import { describe, expect, it } from "vitest";
import { createDefaultEventPlanDraft } from "../domain/event-plan.constants";
import { mapEventPlanToVenueSearchParams } from "./event-plan-search-mapper";

describe("event plan venue search mapper", () => {
  it("maps completed planning answers to existing venue search params", () => {
    const params = mapEventPlanToVenueSearchParams({
      ...createDefaultEventPlanDraft("2026-07-30T01:00:00.000Z"),
      eventType: "wedding",
      preferredProvince: "Cavite",
      preferredCity: "Tagaytay",
      expectedGuestCount: 120,
      budgetPreference: "100001-250000",
      venueStyles: ["garden", "beach", "no-preference"],
      settingPreference: "outdoor",
      requiredAmenities: ["parking", "wifi", "none"],
    });

    expect(params.get("event")).toBe("wedding");
    expect(params.get("province")).toBe("Cavite");
    expect(params.get("city")).toBe("Tagaytay");
    expect(params.get("capacity")).toBe("120");
    expect(params.get("minBudget")).toBe("100001");
    expect(params.get("maxBudget")).toBe("250000");
    expect(params.get("venueTypes")).toBe("garden,beach");
    expect(params.get("indoorOutdoor")).toBe("outdoor");
    expect(params.get("amenities")).toBe("Parking,Wi-Fi");
    expect(params.get("sort")).toBe("recommended");
  });

  it("uses custom budget ranges and avoids leaking questionnaire notes", () => {
    const params = mapEventPlanToVenueSearchParams({
      ...createDefaultEventPlanDraft("2026-07-30T01:00:00.000Z"),
      eventType: "corporate",
      budgetPreference: "custom",
      budgetMin: 75000,
      budgetMax: 175000,
      additionalRequirements: "Private executive board dinner details",
    });

    expect(params.get("minBudget")).toBe("75000");
    expect(params.get("maxBudget")).toBe("175000");
    expect(params.toString()).not.toContain("Private");
    expect(params.toString()).not.toContain("executive");
  });
});
