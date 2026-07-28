import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAIEventPlan } from "./application/ai-planner";

describe("AI Event Planner Zod Validation & Deterministic Fallback", () => {
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    vi.unstubAllGlobals();
  });

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

  it("returns validated provider output when available", async () => {
    process.env.OPENROUTER_API_KEY = "test-provider-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  recommendedMilestones: [
                    {
                      title: "Confirm venue",
                      timeline: "Six months out",
                      category: "Venue",
                    },
                  ],
                  suggestedServices: ["Catering"],
                  budgetAllocation: [
                    {
                      category: "Venue",
                      percentage: 40,
                      estimatedAmount: 120000,
                    },
                  ],
                }),
              },
            },
          ],
        }),
      }),
    );

    const plan = await generateAIEventPlan({
      eventType: "Wedding",
      guestCount: 150,
      budgetAmount: 300000,
    });

    expect(plan.fallbackUsed).toBe(false);
    expect(plan.recommendedMilestones[0]?.title).toBe("Confirm venue");
    expect(fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining('"model":"qwen/qwen3.7-flash"'),
      }),
    );
  });

  it("falls back when provider output is malformed", async () => {
    process.env.OPENROUTER_API_KEY = "test-provider-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "not-json" } }],
        }),
      }),
    );

    const plan = await generateAIEventPlan({
      eventType: "Wedding",
      guestCount: 150,
      budgetAmount: 300000,
    });

    expect(plan.fallbackUsed).toBe(true);
  });
});
