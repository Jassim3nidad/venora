import { describe, it, expect } from "vitest";
import { calculateDeterministicBudget } from "./budget-advisor";

describe("AI Budget Advisor Deterministic Calculator", () => {
  it("should calculate exact budget breakdown and detect over-budget state", () => {
    const budget = calculateDeterministicBudget(200000, 100000, 100);
    // venue: 100k, catering: 80k, decor: 30k, contingency: 10k -> total: 220k (over by 20k)

    expect(budget.totalEstimated).toBe(220000);
    expect(budget.isOverBudget).toBe(true);
    expect(budget.remainingBudget).toBe(-20000);
  });
});
