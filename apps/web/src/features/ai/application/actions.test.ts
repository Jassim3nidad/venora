import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { generateEventPlanAction } from "./actions";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const validInput = {
  eventType: "Wedding",
  guestCount: 120,
  budgetAmount: 250000,
};

describe("generateEventPlanAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENROUTER_API_KEY;
  });

  it("requires an authenticated user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await generateEventPlanAction(validInput);

    expect(result.error?.code).toBe("UNAUTHORIZED");
  });

  it("generates a plan for validated input", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "customer-id" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await generateEventPlanAction(validInput);

    expect(result.error).toBeNull();
    expect(result.data?.plan.fallbackUsed).toBe(true);
    expect(result.data?.plan.budgetAllocation).toHaveLength(4);
  });

  it("rejects invalid planner input before provider access", async () => {
    const result = await generateEventPlanAction({
      eventType: "",
      guestCount: 0,
      budgetAmount: -1,
    });

    expect(result.error?.code).toBe("VALIDATION_ERROR");
    expect(createClient).not.toHaveBeenCalled();
  });
});
