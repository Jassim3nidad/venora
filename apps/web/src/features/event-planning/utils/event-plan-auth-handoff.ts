import type { EventPlanDraft } from "../domain/event-plan.types";

const EVENT_PLAN_PENDING_SAVE_STORAGE_KEY =
  "venora:event-plan-pending-save:v1";

type PendingSaveUtilityOptions = {
  storage?: Storage | null;
  now?: Date;
};

export type EventPlanPendingSaveIntent = {
  schemaVersion: 1;
  sourceDraftFingerprint: string;
  returnTo: "/plan-event";
  createdAt: string;
};

export type EventPlanPendingSaveLoadResult =
  | { status: "loaded"; intent: EventPlanPendingSaveIntent }
  | { status: "empty" }
  | { status: "unavailable" }
  | { status: "invalid" };

export type EventPlanPendingSaveResult =
  | { success: true; intent: EventPlanPendingSaveIntent }
  | { success: false; error: "storage-unavailable" | "storage-error" };

function resolveStorage(options?: PendingSaveUtilityOptions): Storage | null {
  if (options && "storage" in options) return options.storage ?? null;
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([key]) => key !== "updatedAt")
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function createEventPlanDraftFingerprint(draft: EventPlanDraft) {
  const input = stableJson(draft);
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `draft-${(hash >>> 0).toString(36).padStart(8, "0")}`;
}

export function createPlanEventLoginHref() {
  return "/login?redirectTo=%2Fplan-event";
}

function isPendingSaveIntent(value: unknown): value is EventPlanPendingSaveIntent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Partial<EventPlanPendingSaveIntent>;
  return (
    candidate.schemaVersion === 1 &&
    candidate.returnTo === "/plan-event" &&
    typeof candidate.sourceDraftFingerprint === "string" &&
    candidate.sourceDraftFingerprint.trim().length >= 8 &&
    typeof candidate.createdAt === "string" &&
    !Number.isNaN(new Date(candidate.createdAt).getTime())
  );
}

export function saveEventPlanPendingSave(
  input: Pick<EventPlanPendingSaveIntent, "sourceDraftFingerprint">,
  options?: PendingSaveUtilityOptions,
): EventPlanPendingSaveResult {
  const storage = resolveStorage(options);
  if (!storage) return { success: false, error: "storage-unavailable" };

  const intent: EventPlanPendingSaveIntent = {
    schemaVersion: 1,
    sourceDraftFingerprint: input.sourceDraftFingerprint,
    returnTo: "/plan-event",
    createdAt: (options?.now ?? new Date()).toISOString(),
  };

  try {
    storage.setItem(EVENT_PLAN_PENDING_SAVE_STORAGE_KEY, JSON.stringify(intent));
  } catch {
    return { success: false, error: "storage-error" };
  }

  return { success: true, intent };
}

export function loadEventPlanPendingSave(
  options?: PendingSaveUtilityOptions,
): EventPlanPendingSaveLoadResult {
  const storage = resolveStorage(options);
  if (!storage) return { status: "unavailable" };

  let raw: string | null;
  try {
    raw = storage.getItem(EVENT_PLAN_PENDING_SAVE_STORAGE_KEY);
  } catch {
    return { status: "invalid" };
  }

  if (!raw) return { status: "empty" };

  try {
    const decoded = JSON.parse(raw);
    if (!isPendingSaveIntent(decoded)) return { status: "invalid" };
    return { status: "loaded", intent: decoded };
  } catch {
    return { status: "invalid" };
  }
}

export function clearEventPlanPendingSave(
  options?: PendingSaveUtilityOptions,
) {
  const storage = resolveStorage(options);
  if (!storage) return;

  try {
    storage.removeItem(EVENT_PLAN_PENDING_SAVE_STORAGE_KEY);
  } catch {
    // A failed cleanup should never break the event planning page.
  }
}
