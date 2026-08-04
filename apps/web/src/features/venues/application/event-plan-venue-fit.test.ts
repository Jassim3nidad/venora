import { describe, expect, it } from "vitest";
import { createDefaultEventPlanDraft } from "@/src/features/event-planning/domain/event-plan.constants";
import type { PersistedEventPlan } from "@/src/features/event-planning/domain/event-plan.types";
import type { PublicVenueProfileViewModel } from "./public-venue-profile";
import {
  buildEventPlanVenueFit,
  selectLatestUsableEventPlan,
} from "./event-plan-venue-fit";

const profile: PublicVenueProfileViewModel = {
  mode: "public",
  source: "structured",
  venue: {
    id: "venue-1",
    slug: "garden-hall",
    name: "Garden Hall",
    description: null,
    shortDescription: null,
    address: null,
    city: "Tagaytay",
    province: "Cavite",
    locationLabel: "Tagaytay, Cavite",
    capacityMin: 20,
    capacityMax: 180,
    setting: "both",
    basePrice: 100000,
    priceUnit: "per_event",
    verified: true,
  },
  hero: { image: null, video: null },
  gallery: [],
  quickFacts: [],
  spaces: [
    {
      key: "garden",
      slug: "garden",
      name: "Garden Pavilion",
      setting: "Outdoor",
      type: null,
      shortDescription: null,
      description: null,
      capacityMin: 20,
      capacityMax: 120,
      capacityLayouts: [],
      amenities: ["Wi-Fi"],
      eventTypes: ["Wedding"],
      accessibility: null,
      restrictions: null,
      operatingNotes: null,
      media: [],
    },
    {
      key: "hall",
      slug: "hall",
      name: "Indoor Hall",
      setting: "Indoor",
      type: null,
      shortDescription: null,
      description: null,
      capacityMin: 20,
      capacityMax: 180,
      capacityLayouts: [],
      amenities: [],
      eventTypes: ["Wedding"],
      accessibility: null,
      restrictions: null,
      operatingNotes: null,
      media: [],
    },
  ],
  eventTypes: ["Wedding"],
  packages: [],
  amenities: ["Wi-Fi", "Wheelchair Ramp"],
  logistics: [
    { key: "parking", label: "Parking", value: "On-site" },
    { key: "accessibility", label: "Accessibility", value: "Ramp" },
    { key: "weather-backup", label: "Weather backup", value: "Indoor hall" },
  ],
  faqs: [],
  rating: { average: 0, count: 0 },
  owner: null,
  actions: {
    venueHref: "/venues/garden-hall",
    bookingHref: "/venues/garden-hall/book",
    eventPlanHref: "/plan-event",
  },
  sections: ["overview", "spaces", "reviews"],
};

function plan(overrides: Partial<PersistedEventPlan> = {}): PersistedEventPlan {
  return {
    ...createDefaultEventPlanDraft("2026-07-02T00:00:00Z"),
    id: "plan-1",
    customerId: "customer-1",
    title: "Wedding plan",
    status: "completed",
    createdAt: "2026-07-01T00:00:00Z",
    archivedAt: null,
    updatedAt: "2026-07-02T00:00:00Z",
    eventType: "wedding",
    expectedGuestCount: 100,
    preferredProvince: "Cavite",
    preferredCity: "Tagaytay",
    settingPreference: "both",
    requiredAmenities: [
      "parking",
      "accessible-entrance",
      "backup-indoor-space",
      "wifi",
      "lighting",
    ],
    budgetMin: 50000,
    budgetMax: 150000,
    ...overrides,
  };
}

describe("event plan venue fit", () => {
  it("selects the latest usable non-archived plan", () => {
    expect(
      selectLatestUsableEventPlan([
        plan({ id: "archived", status: "archived", archivedAt: "2026-07-03" }),
        plan({ id: "usable" }),
      ])?.id,
    ).toBe("usable");
    expect(selectLatestUsableEventPlan([])).toBeNull();
  });

  it("explains only deterministic supported criteria", () => {
    const fit = buildEventPlanVenueFit(plan(), profile);
    const keys = fit.explanations.map((item) => item.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        "guest-count",
        "province",
        "city",
        "setting",
        "event-type",
        "amenity-parking",
        "amenity-accessibility",
        "amenity-weather-backup",
        "amenity-wifi",
      ]),
    );
    expect(keys).not.toContain("amenity-lighting");
  });

  it("never emits budget, a numeric score, or an availability promise", () => {
    const fit = buildEventPlanVenueFit(plan(), profile);
    const output = JSON.stringify(fit).toLocaleLowerCase();

    expect(output).not.toContain("budget");
    expect(output).not.toContain("match percentage");
    expect(output).not.toContain("guaranteed");
    expect(output).not.toContain("plan-1");
    expect(fit.confirmationNote).toContain("need confirmation");
  });
});
