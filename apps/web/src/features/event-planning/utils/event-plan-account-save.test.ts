import { describe, expect, it, vi } from "vitest";
import { createDefaultEventPlanDraft } from "../domain/event-plan.constants";
import type {
  EventPlanDraft,
  PersistedEventPlan,
} from "../domain/event-plan.types";
import { loadEventPlanDraft } from "./event-plan-draft";
import { saveEventPlanToAccount } from "./event-plan-account-save";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const planId = "00000000-0000-4000-8000-000000000002";

function validDraft(): EventPlanDraft {
  return {
    ...createDefaultEventPlanDraft("2026-07-30T01:00:00.000Z"),
    currentStep: "summary" as const,
    eventType: "wedding" as const,
    datePreferenceType: "exact" as const,
    exactDate: "2026-12-12",
    preferredProvince: "Cavite",
    preferredCity: "Tagaytay",
    nearbyLocationsAllowed: true,
    expectedGuestCount: 120,
    budgetPreference: "not-sure" as const,
    completedSteps: ["event-basics", "date-location"],
  };
}

function persistedPlan(): PersistedEventPlan {
  return {
    ...validDraft(),
    id: planId,
    customerId: "00000000-0000-4000-8000-000000000001",
    title: "Wedding in Cavite",
    status: "draft",
    createdAt: "2026-07-30T00:00:00.000Z",
    archivedAt: null,
  };
}

describe("event plan account save helper", () => {
  it("updates an existing saved plan instead of creating a duplicate", async () => {
    const create = vi.fn();
    const update = vi.fn().mockResolvedValue({
      success: true,
      data: persistedPlan(),
    });

    const result = await saveEventPlanToAccount({
      draft: validDraft(),
      savedPlanId: planId,
      create,
      update,
      storage: new MemoryStorage(),
    });

    expect(result.success).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        planId,
        draft: expect.objectContaining({ eventType: "wedding" }),
      }),
    );
  });

  it("keeps the local draft when an authenticated update fails", async () => {
    const storage = new MemoryStorage();
    const draft = validDraft();
    const update = vi.fn().mockResolvedValue({
      success: false,
      error: "Unable to save event plan. Please try again.",
    });

    const result = await saveEventPlanToAccount({
      draft,
      savedPlanId: planId,
      create: vi.fn(),
      update,
      storage,
    });

    expect(result).toEqual({
      success: false,
      error: "Unable to save event plan. Please try again.",
    });
    const localDraft = loadEventPlanDraft({ storage });
    expect(localDraft.status).toBe("loaded");
    if (localDraft.status === "loaded") {
      expect(localDraft.draft.eventType).toBe("wedding");
      expect(localDraft.draft.preferredCity).toBe("Tagaytay");
    }
  });
});
