import { describe, it, expect } from "vitest";
import { generateAIEventPlan } from "./application/ai-planner";

describe("AI Event Planner Zod Validation & Deterministic Fallback", () => {
  it("should return a deterministic fallback plan when API key is unconfigured", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const plan = await generateAIEventPlan({
      eventType: "Wedding",
      guestCount: 150,
      budgetAmount: 300000,
    });

    expect(plan.fallbackUsed).toBe(true);
    expect(plan.budgetAllocation).toHaveLength(4);
    expect(plan.budgetAllocation[0]?.estimatedAmount).toBe(120000); // 40% of 300,000
  });
});
