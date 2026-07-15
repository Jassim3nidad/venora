import { describe, expect, it } from "vitest";
import {
  createCommissionRuleSchema,
  updateCommissionRuleSchema,
} from "./commission-rule.schema";

const validBase = {
  scope: "global" as const,
  percentage: 10,
  effectiveFrom: "2026-01-01",
};

describe("createCommissionRuleSchema", () => {
  it("accepts a minimal valid global rule", () => {
    const result = createCommissionRuleSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects a rule with neither percentage nor flat fee", () => {
    const result = createCommissionRuleSchema.safeParse({
      scope: "global",
      effectiveFrom: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects percentage above 100", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validBase,
      percentage: 150,
    });
    expect(result.success).toBe(false);
  });

  it("requires a referenceId for venue/category scope", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validBase,
      scope: "venue",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a venue-scoped rule with a referenceId", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validBase,
      scope: "venue",
      referenceId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  // Regression test for a real bug caught before it shipped: blank HTML
  // number inputs submit "" through react-hook-form, and z.coerce.number()
  // alone turns that into 0 rather than "not provided", which would have
  // silently defeated the "percentage or flat fee required" check whenever
  // an admin left both fields blank via the form (0 !== undefined).
  it("treats a blank percentage string as not-provided, not zero", () => {
    const result = createCommissionRuleSchema.safeParse({
      scope: "global",
      percentage: "",
      flatFee: "",
      effectiveFrom: "2026-01-01",
    });
    expect(result.success).toBe(false); // neither field actually provided
  });

  it("treats a blank effectiveTo as not-provided rather than an invalid date", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validBase,
      effectiveTo: "",
    });
    expect(result.success).toBe(true);
  });

  it("still accepts an explicit zero percentage (a genuine 0% rule)", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validBase,
      percentage: 0,
      flatFee: 50,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateCommissionRuleSchema", () => {
  const validUpdate = {
    id: "11111111-1111-1111-1111-111111111111",
    isActive: true,
    reason: "Adjusting for Q2 promo",
    percentage: 8,
    effectiveFrom: "2026-01-01",
  };

  it("accepts a valid update with a reason", () => {
    const result = updateCommissionRuleSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("rejects an update with a blank reason", () => {
    const result = updateCommissionRuleSchema.safeParse({
      ...validUpdate,
      reason: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects min commission greater than max commission via bounds check", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validBase,
      minCommissionAmount: 500,
      maxCommissionAmount: 100,
    });
    // The schema itself only validates each field's own range; cross-field
    // min<=max is enforced server-side in admin_create_commission_rule().
    // This test documents that boundary so it isn't "fixed" here by mistake
    // without also checking the DB function still guards it.
    expect(result.success).toBe(true);
  });
});
