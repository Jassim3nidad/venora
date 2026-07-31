import { describe, expect, it } from "vitest";
import { createDefaultEventPlanDraft } from "../domain/event-plan.constants";
import {
  clearEventPlanPendingSave,
  createEventPlanDraftFingerprint,
  createPlanEventLoginHref,
  loadEventPlanPendingSave,
  saveEventPlanPendingSave,
} from "./event-plan-auth-handoff";

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

describe("event plan auth handoff", () => {
  it("builds a safe login redirect without questionnaire answers in the URL", () => {
    const href = createPlanEventLoginHref();

    expect(href).toBe("/login?redirectTo=%2Fplan-event");
    expect(href).not.toContain("wedding");
    expect(href).not.toContain("Tagaytay");
  });

  it("stores only a fingerprint and metadata for pending authenticated saves", () => {
    const storage = new MemoryStorage();
    const draft = {
      ...createDefaultEventPlanDraft("2026-07-30T01:00:00.000Z"),
      eventType: "wedding" as const,
      preferredCity: "Tagaytay",
    };
    const fingerprint = createEventPlanDraftFingerprint(draft);

    const saveResult = saveEventPlanPendingSave(
      { sourceDraftFingerprint: fingerprint },
      { storage, now: new Date("2026-07-30T02:00:00.000Z") },
    );

    expect(saveResult.success).toBe(true);
    const raw = Array.from({ length: storage.length }, (_, index) =>
      storage.getItem(storage.key(index) ?? ""),
    ).join(" ");
    expect(raw).toContain(fingerprint);
    expect(raw).not.toContain("wedding");
    expect(raw).not.toContain("Tagaytay");

    expect(loadEventPlanPendingSave({ storage })).toEqual({
      status: "loaded",
      intent: {
        schemaVersion: 1,
        sourceDraftFingerprint: fingerprint,
        returnTo: "/plan-event",
        createdAt: "2026-07-30T02:00:00.000Z",
      },
    });
  });

  it("uses a stable fingerprint and clears only the pending-save key", () => {
    const storage = new MemoryStorage();
    const draft = createDefaultEventPlanDraft("2026-07-30T01:00:00.000Z");
    const fingerprint = createEventPlanDraftFingerprint(draft);

    expect(createEventPlanDraftFingerprint({ ...draft })).toBe(fingerprint);

    saveEventPlanPendingSave({ sourceDraftFingerprint: fingerprint }, { storage });
    storage.setItem("venora:other", "keep");
    clearEventPlanPendingSave({ storage });

    expect(loadEventPlanPendingSave({ storage })).toEqual({ status: "empty" });
    expect(storage.getItem("venora:other")).toBe("keep");
  });
});
