import { describe, expect, it } from "vitest";
import { fromMinorUnits, toMinorUnits, formatMoney } from "./money.vo";

describe("toMinorUnits", () => {
  it("converts whole pesos to centavos", () => {
    expect(toMinorUnits(1500)).toBe(150000);
  });

  it("converts fractional pesos to centavos", () => {
    expect(toMinorUnits(1500.5)).toBe(150050);
  });

  it("rounds to the nearest centavo instead of truncating", () => {
    // 10.005 * 100 = 1000.4999999999999 in floating point — must round, not floor.
    expect(toMinorUnits(10.005)).toBe(1001);
  });

  it("handles zero", () => {
    expect(toMinorUnits(0)).toBe(0);
  });

  it("rejects negative amounts", () => {
    expect(() => toMinorUnits(-1)).toThrow(RangeError);
  });

  it("rejects non-finite amounts", () => {
    expect(() => toMinorUnits(NaN)).toThrow(RangeError);
    expect(() => toMinorUnits(Infinity)).toThrow(RangeError);
  });
});

describe("fromMinorUnits", () => {
  it("converts centavos back to pesos", () => {
    expect(fromMinorUnits(150050)).toBe(1500.5);
  });

  it("handles zero", () => {
    expect(fromMinorUnits(0)).toBe(0);
  });

  it("rejects negative minor units", () => {
    expect(() => fromMinorUnits(-1)).toThrow(RangeError);
  });

  it("round-trips exactly for typical deposit amounts", () => {
    const original = 12345.67;
    expect(fromMinorUnits(toMinorUnits(original))).toBe(original);
  });
});

describe("formatMoney", () => {
  it("formats PHP currency with two decimal places", () => {
    const formatted = formatMoney(1500.5);
    expect(formatted).toContain("1,500.50");
  });
});
