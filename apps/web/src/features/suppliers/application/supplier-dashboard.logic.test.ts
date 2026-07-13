import { describe, expect, it } from "vitest";
import {
  calculateSupplierQuoteTotals,
  canSupplierTransitionQuote,
  isSupplierDateUnavailable,
} from "./supplier-dashboard.logic";

describe("supplier dashboard business rules", () => {
  it("calculates quote totals from line items", () => {
    expect(
      calculateSupplierQuoteTotals(
        [
          { quantity: 2, unitPrice: 12500 },
          { quantity: 1, unitPrice: 5000 },
        ],
        1500,
      ),
    ).toEqual({ subtotal: 30000, additionalFees: 1500, total: 31500 });
  });

  it("allows suppliers to send drafts and withdraw sent quotes only", () => {
    expect(canSupplierTransitionQuote("draft", "sent")).toBe(true);
    expect(canSupplierTransitionQuote("sent", "withdrawn")).toBe(true);
    expect(canSupplierTransitionQuote("draft", "accepted")).toBe(false);
    expect(canSupplierTransitionQuote("accepted", "withdrawn")).toBe(false);
  });

  it("blocks manual unavailable states and confirmed jobs", () => {
    expect(isSupplierDateUnavailable("blocked", false)).toBe(true);
    expect(isSupplierDateUnavailable("unavailable", false)).toBe(true);
    expect(isSupplierDateUnavailable("available", false)).toBe(false);
    expect(isSupplierDateUnavailable(null, true)).toBe(true);
  });
});
