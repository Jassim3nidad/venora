import { describe, expect, it } from "vitest";
import { venueAutoAcceptSettingsSchema } from "./auto-accept.schema";

const validSettings = {
  enabled: true,
  minimumNoticeHours: 48,
  maximumGuestCount: 150,
  allowedWeekdays: [1, 2, 3, 4, 5],
  allowedStartTime: "08:00",
  allowedEndTime: "22:00",
  minimumDurationMinutes: 120,
  maximumDurationMinutes: 720,
  minimumBookingAmount: 10000,
  requireStandardPackage: true,
  requireDeposit: true,
  requireVerifiedCustomer: true,
  allowedEventTypeIds: null,
  confidenceThreshold: 0.85,
  reviewWindowMinutes: 30,
};

describe("venueAutoAcceptSettingsSchema", () => {
  it("accepts valid supplier controls", () => {
    expect(venueAutoAcceptSettingsSchema.safeParse(validSettings).success).toBe(
      true,
    );
  });

  it("rejects empty booking days and reversed hours", () => {
    const result = venueAutoAcceptSettingsSchema.safeParse({
      ...validSettings,
      allowedWeekdays: [],
      allowedStartTime: "22:00",
      allowedEndTime: "08:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside zero to one", () => {
    const result = venueAutoAcceptSettingsSchema.safeParse({
      ...validSettings,
      confidenceThreshold: 1.1,
    });
    expect(result.success).toBe(false);
  });
});
