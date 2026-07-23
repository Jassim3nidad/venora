import { z } from "zod";

export const eventPlanInputSchema = z.object({
  eventType: z.string().min(2),
  guestCount: z.number().int().positive(),
  budgetAmount: z.number().positive(),
  preferredCity: z.string().optional(),
  eventDate: z.string().optional(),
});

export type EventPlanInput = z.infer<typeof eventPlanInputSchema>;

export interface AIEventPlanResult {
  recommendedMilestones: Array<{ title: string; timeline: string; category: string }>;
  suggestedServices: string[];
  budgetAllocation: Array<{ category: string; percentage: number; estimatedAmount: number }>;
  fallbackUsed: boolean;
}

export async function generateAIEventPlan(input: EventPlanInput): Promise<AIEventPlanResult> {
  const validated = eventPlanInputSchema.parse(input);

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return generateDeterministicFallbackPlan(validated);
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert event planner advisor. Return a structured JSON plan matching the requested format.",
          },
          {
            role: "user",
            content: `Create an event plan for a ${validated.eventType} with ${validated.guestCount} guests and budget ₱${validated.budgetAmount}.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return generateDeterministicFallbackPlan(validated);
    }

    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content;
    if (!textContent) {
      return generateDeterministicFallbackPlan(validated);
    }

    return generateDeterministicFallbackPlan(validated);
  } catch {
    return generateDeterministicFallbackPlan(validated);
  }
}

function generateDeterministicFallbackPlan(input: EventPlanInput): AIEventPlanResult {
  const b = input.budgetAmount;
  return {
    fallbackUsed: true,
    recommendedMilestones: [
      { title: "Venue Selection & Deposit", timeline: "6 Months Out", category: "Venue" },
      { title: "Catering & Menu Tasting", timeline: "4 Months Out", category: "Catering" },
      { title: "Final RSVP & Seating Plan", timeline: "2 Weeks Out", category: "Planning" },
    ],
    suggestedServices: ["Venue Booking", "Catering & Beverages", "Photography & Videography", "Sounds & Lighting"],
    budgetAllocation: [
      { category: "Venue Rental", percentage: 40, estimatedAmount: b * 0.4 },
      { category: "Catering & Drinks", percentage: 35, estimatedAmount: b * 0.35 },
      { category: "Media & Decor", percentage: 15, estimatedAmount: b * 0.15 },
      { category: "Contingency & Fees", percentage: 10, estimatedAmount: b * 0.1 },
    ],
  };
}
