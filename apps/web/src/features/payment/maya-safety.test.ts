import { describe, it, expect } from "vitest";

export function isMayaPaymentAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MAYA_PAYMENTS === "true";
}

describe("Maya Payment Provider Safety Enforcer", () => {
  it("should reject Maya payment requests when feature flag is disabled", () => {
    delete process.env.NEXT_PUBLIC_ENABLE_MAYA_PAYMENTS;
    expect(isMayaPaymentAllowed()).toBe(false);

    process.env.NEXT_PUBLIC_ENABLE_MAYA_PAYMENTS = "false";
    expect(isMayaPaymentAllowed()).toBe(false);
  });
});
