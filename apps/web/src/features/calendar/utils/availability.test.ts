import { describe, expect, it } from "vitest";
import {
  buildCustomerAvailabilityMap,
  getCustomerAvailabilityLabel,
  getCustomerAvailabilityMessage,
  isCustomerSelectableAvailabilityStatus,
} from "./availability";

describe("customer availability helpers", () => {
  it("treats a missing availability row as selectable", () => {
    expect(isCustomerSelectableAvailabilityStatus(undefined)).toBe(true);
    expect(getCustomerAvailabilityLabel(undefined)).toBe("Available");
    expect(getCustomerAvailabilityMessage(undefined)).toBe(
      "This date is available for booking.",
    );
  });

  it("allows explicit available dates", () => {
    expect(isCustomerSelectableAvailabilityStatus("available")).toBe(true);
    expect(getCustomerAvailabilityLabel("available")).toBe("Available");
  });

  it.each([
    [
      "reserved",
      "Booked",
      "This date is already booked. Please choose another date.",
    ],
    [
      "tentative",
      "Pending",
      "This date has a pending request and cannot be booked yet.",
    ],
    [
      "maintenance",
      "Maintenance",
      "This date is unavailable due to maintenance.",
    ],
    [
      "blackout",
      "Blocked",
      "This date is unavailable. Please choose another date.",
    ],
  ] as const)("blocks %s dates", (status, label, message) => {
    expect(isCustomerSelectableAvailabilityStatus(status)).toBe(false);
    expect(getCustomerAvailabilityLabel(status)).toBe(label);
    expect(getCustomerAvailabilityMessage(status)).toBe(message);
  });

  it("maps database rows to calendar availability values", () => {
    expect(
      buildCustomerAvailabilityMap([
        { date: "2026-12-01", status: "available" },
        { date: "2026-12-02", status: "reserved" },
        { date: "2026-12-03", status: "unexpected" },
        { date: "2026-12-04", status: null },
      ]),
    ).toEqual({
      "2026-12-01": "available",
      "2026-12-02": "reserved",
    });
  });
});
