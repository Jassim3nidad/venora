import { describe, expect, it } from "vitest";
import {
  clearEventPlanDraft,
  isEventPlanDraftExpired,
  loadEventPlanDraft,
  migrateEventPlanDraft,
  saveEventPlanDraft,
} from "./event-plan-draft";
import {
  EVENT_PLAN_DRAFT_STORAGE_KEY,
  createDefaultEventPlanDraft,
} from "../domain/event-plan.constants";

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

class ThrowingStorage extends MemoryStorage {
  constructor(private readonly mode: "read" | "write") {
    super();
  }

  override getItem(key: string): string | null {
    if (this.mode === "read") {
      throw new Error("Read blocked");
    }
    return super.getItem(key);
  }

  override setItem(key: string, value: string): void {
    if (this.mode === "write") {
      throw new Error("Quota exceeded");
    }
    super.setItem(key, value);
  }
}

describe("event plan draft persistence", () => {
  it("saves and restores a valid draft with a refreshed timestamp", () => {
    const storage = new MemoryStorage();
    const draft = {
      ...createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z"),
      eventType: "wedding" as const,
    };

    const saveResult = saveEventPlanDraft(draft, {
      storage,
      now: new Date("2099-01-02T00:00:00.000Z"),
    });

    expect(saveResult).toEqual({
      success: true,
      draft: {
        ...draft,
        updatedAt: "2099-01-02T00:00:00.000Z",
      },
    });

    const loadResult = loadEventPlanDraft({
      storage,
      now: new Date("2099-01-03T00:00:00.000Z"),
    });

    expect(loadResult.status).toBe("loaded");
    if (loadResult.status === "loaded") {
      expect(loadResult.draft.eventType).toBe("wedding");
      expect(loadResult.draft.updatedAt).toBe("2099-01-02T00:00:00.000Z");
    }
  });

  it("restores the same draft after a simulated refresh", () => {
    const storage = new MemoryStorage();
    const draft = createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z");

    saveEventPlanDraft(draft, {
      storage,
      now: new Date("2099-01-02T00:00:00.000Z"),
    });

    expect(loadEventPlanDraft({ storage }).status).toBe("loaded");
    expect(loadEventPlanDraft({ storage }).status).toBe("loaded");
  });

  it("rejects corrupt JSON and unsupported schema versions", () => {
    const storage = new MemoryStorage();
    storage.setItem(EVENT_PLAN_DRAFT_STORAGE_KEY, "{bad json");

    expect(loadEventPlanDraft({ storage })).toEqual({
      status: "invalid",
      reason: "corrupt-json",
    });

    storage.setItem(
      EVENT_PLAN_DRAFT_STORAGE_KEY,
      JSON.stringify({
        ...createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z"),
        schemaVersion: 2,
      }),
    );

    expect(loadEventPlanDraft({ storage })).toEqual({
      status: "invalid",
      reason: "invalid-schema",
    });
  });

  it("rejects expired drafts", () => {
    const draft = createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z");
    const storage = new MemoryStorage();
    storage.setItem(EVENT_PLAN_DRAFT_STORAGE_KEY, JSON.stringify(draft));

    expect(
      isEventPlanDraftExpired(draft, new Date("2099-02-01T00:00:00.000Z")),
    ).toBe(true);
    expect(
      loadEventPlanDraft({
        storage,
        now: new Date("2099-02-01T00:00:00.000Z"),
      }),
    ).toEqual({
      status: "invalid",
      reason: "expired",
    });
  });

  it("handles unavailable storage and storage read or write exceptions", () => {
    expect(loadEventPlanDraft({ storage: null })).toEqual({
      status: "unavailable",
    });

    expect(loadEventPlanDraft({ storage: new ThrowingStorage("read") })).toEqual(
      {
        status: "invalid",
        reason: "storage-error",
      },
    );

    expect(
      saveEventPlanDraft(createDefaultEventPlanDraft(), {
        storage: new ThrowingStorage("write"),
      }),
    ).toEqual({
      success: false,
      error: "storage-error",
    });
  });

  it("clears only the event-plan key", () => {
    const storage = new MemoryStorage();
    storage.setItem(EVENT_PLAN_DRAFT_STORAGE_KEY, "{}");
    storage.setItem("venora:other", "keep");

    clearEventPlanDraft({ storage });

    expect(storage.getItem(EVENT_PLAN_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("venora:other")).toBe("keep");
  });

  it("does not persist invalid drafts", () => {
    const storage = new MemoryStorage();
    const invalidDraft = {
      ...createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z"),
      eventType: "invalid",
    };

    expect(saveEventPlanDraft(invalidDraft, { storage })).toEqual({
      success: false,
      error: "invalid-draft",
    });
    expect(storage.getItem(EVENT_PLAN_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("migrates only valid current-version drafts", () => {
    const draft = createDefaultEventPlanDraft("2099-01-01T00:00:00.000Z");

    expect(migrateEventPlanDraft(draft)).toEqual(draft);
    expect(migrateEventPlanDraft({ ...draft, schemaVersion: 999 })).toBeNull();
  });

  it("does not reference window when called without browser storage", () => {
    expect(() => loadEventPlanDraft({ storage: null })).not.toThrow();
    expect(() =>
      saveEventPlanDraft(createDefaultEventPlanDraft(), { storage: null }),
    ).not.toThrow();
  });
});
