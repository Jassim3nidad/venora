import {
  EVENT_PLAN_DRAFT_EXPIRATION_DAYS,
  EVENT_PLAN_DRAFT_STORAGE_KEY,
} from "../domain/event-plan.constants";
import type { EventPlanDraft } from "../domain/event-plan.types";
import { eventPlanDraftSchema } from "../schemas/event-plan.schema";

type DraftUtilityOptions = {
  storage?: Storage | null;
  now?: Date;
};

export type EventPlanDraftLoadResult =
  | { status: "loaded"; draft: EventPlanDraft }
  | { status: "empty" }
  | { status: "unavailable" }
  | {
      status: "invalid";
      reason:
        | "corrupt-json"
        | "invalid-schema"
        | "expired"
        | "storage-error";
    };

export type EventPlanDraftSaveResult =
  | { success: true; draft: EventPlanDraft }
  | {
      success: false;
      error: "storage-unavailable" | "storage-error" | "invalid-draft";
    };

function resolveStorage(options?: DraftUtilityOptions): Storage | null {
  if (options && "storage" in options) {
    return options.storage ?? null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function refreshUpdatedAt(value: unknown, now: Date): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }

  return {
    ...value,
    updatedAt: now.toISOString(),
  };
}

export function isEventPlanDraftExpired(
  draft: EventPlanDraft,
  now = new Date(),
) {
  const updatedAt = new Date(draft.updatedAt);

  if (Number.isNaN(updatedAt.getTime())) {
    return true;
  }

  const ageMs = now.getTime() - updatedAt.getTime();
  const maxAgeMs = EVENT_PLAN_DRAFT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
  return ageMs > maxAgeMs;
}

export function migrateEventPlanDraft(value: unknown): EventPlanDraft | null {
  const parsed = eventPlanDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function loadEventPlanDraft(
  options?: DraftUtilityOptions,
): EventPlanDraftLoadResult {
  const storage = resolveStorage(options);

  if (!storage) {
    return { status: "unavailable" };
  }

  let raw: string | null;
  try {
    raw = storage.getItem(EVENT_PLAN_DRAFT_STORAGE_KEY);
  } catch {
    return { status: "invalid", reason: "storage-error" };
  }

  if (!raw) {
    return { status: "empty" };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return { status: "invalid", reason: "corrupt-json" };
  }

  const draft = migrateEventPlanDraft(decoded);
  if (!draft) {
    return { status: "invalid", reason: "invalid-schema" };
  }

  if (isEventPlanDraftExpired(draft, options?.now ?? new Date())) {
    return { status: "invalid", reason: "expired" };
  }

  return { status: "loaded", draft };
}

export function saveEventPlanDraft(
  draft: unknown,
  options?: DraftUtilityOptions,
): EventPlanDraftSaveResult {
  const storage = resolveStorage(options);

  if (!storage) {
    return { success: false, error: "storage-unavailable" };
  }

  const candidate = refreshUpdatedAt(draft, options?.now ?? new Date());
  const parsed = eventPlanDraftSchema.safeParse(candidate);

  if (!parsed.success) {
    return { success: false, error: "invalid-draft" };
  }

  try {
    storage.setItem(EVENT_PLAN_DRAFT_STORAGE_KEY, JSON.stringify(parsed.data));
  } catch {
    return { success: false, error: "storage-error" };
  }

  return { success: true, draft: parsed.data };
}

export function clearEventPlanDraft(options?: DraftUtilityOptions) {
  const storage = resolveStorage(options);

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(EVENT_PLAN_DRAFT_STORAGE_KEY);
  } catch {
    // Clearing a local draft should never crash the caller.
  }
}
