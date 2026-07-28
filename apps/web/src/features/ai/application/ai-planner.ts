import { z } from "zod";

export const eventPlanInputSchema = z.object({
  eventType: z.string().min(2).max(80),
  guestCount: z.number().int().positive(),
  budgetAmount: z.number().positive(),
  preferredCity: z.string().max(100).optional(),
  eventDate: z.string().date().optional(),
});

export type EventPlanInput = z.infer<typeof eventPlanInputSchema>;

export interface AIEventPlanResult {
  recommendedMilestones: Array<{
    title: string;
    timeline: string;
    category: string;
  }>;
  suggestedServices: string[];
  budgetAllocation: Array<{
    category: string;
    percentage: number;
    estimatedAmount: number;
  }>;
  fallbackUsed: boolean;
}

const generatedEventPlanSchema = z.object({
  recommendedMilestones: z
    .array(
      z.object({
        title: z.string().min(2).max(120),
        timeline: z.string().min(2).max(80),
        category: z.string().min(2).max(60),
      }),
    )
    .min(1)
    .max(10),
  suggestedServices: z.array(z.string().min(2).max(100)).min(1).max(12),
  budgetAllocation: z
    .array(
      z.object({
        category: z.string().min(2).max(80),
        percentage: z.number().min(0).max(100),
        estimatedAmount: z.number().nonnegative(),
      }),
    )
    .min(1)
    .max(12),
});

function parseGeneratedPlan(
  content: unknown,
  budgetAmount: number,
): AIEventPlanResult | null {
  if (typeof content !== "string") {
    return null;
  }

  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed = generatedEventPlanSchema.safeParse(JSON.parse(normalized));
    if (!parsed.success) {
      return null;
    }

    const allocatedAmount = parsed.data.budgetAllocation.reduce(
      (sum, allocation) => sum + allocation.estimatedAmount,
      0,
    );
    const allocatedPercentage = parsed.data.budgetAllocation.reduce(
      (sum, allocation) => sum + allocation.percentage,
      0,
    );

    if (allocatedAmount > budgetAmount || allocatedPercentage > 100) {
      return null;
    }

    return { ...parsed.data, fallbackUsed: false };
  } catch {
    return null;
  }
}

export async function generateAIEventPlan(
  input: EventPlanInput,
): Promise<AIEventPlanResult> {
  const validated = eventPlanInputSchema.parse(input);

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return generateDeterministicFallbackPlan(validated);
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3.7-flash",
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are an event planning advisor. Return only JSON with recommendedMilestones (title, timeline, category), suggestedServices, and budgetAllocation (category, percentage, estimatedAmount). Keep allocations realistic and within the supplied budget.",
            },
            {
              role: "user",
              content: JSON.stringify(validated),
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      return generateDeterministicFallbackPlan(validated);
    }

    const data = await response.json();
    const generatedPlan = parseGeneratedPlan(
      data?.choices?.[0]?.message?.content,
      validated.budgetAmount,
    );

    return generatedPlan ?? generateDeterministicFallbackPlan(validated);
  } catch {
    return generateDeterministicFallbackPlan(validated);
  }
}

function generateDeterministicFallbackPlan(
  input: EventPlanInput,
): AIEventPlanResult {
  const b = input.budgetAmount;
  return {
    fallbackUsed: true,
    recommendedMilestones: [
      {
        title: "Venue Selection & Deposit",
        timeline: "6 Months Out",
        category: "Venue",
      },
      {
        title: "Catering & Menu Tasting",
        timeline: "4 Months Out",
        category: "Catering",
      },
      {
        title: "Final RSVP & Seating Plan",
        timeline: "2 Weeks Out",
        category: "Planning",
      },
    ],
    suggestedServices: [
      "Venue Booking",
      "Catering & Beverages",
      "Photography & Videography",
      "Sounds & Lighting",
    ],
    budgetAllocation: [
      { category: "Venue Rental", percentage: 40, estimatedAmount: b * 0.4 },
      {
        category: "Catering & Drinks",
        percentage: 35,
        estimatedAmount: b * 0.35,
      },
      { category: "Media & Decor", percentage: 15, estimatedAmount: b * 0.15 },
      {
        category: "Contingency & Fees",
        percentage: 10,
        estimatedAmount: b * 0.1,
      },
    ],
  };
}
