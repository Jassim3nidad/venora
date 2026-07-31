import type {
  EventPlanActionResult,
  EventPlanDraft,
  PersistedEventPlan,
} from "../domain/event-plan.types";
import { eventPlanPersistenceSchema } from "../schemas/event-plan.schema";
import { buildEventPlanTitle } from "./event-plan-summary";
import {
  clearEventPlanPendingSave,
  createEventPlanDraftFingerprint,
  saveEventPlanPendingSave,
} from "./event-plan-auth-handoff";
import { clearEventPlanDraft, saveEventPlanDraft } from "./event-plan-draft";

type CreateAccountPlan = (input: {
  draft: EventPlanDraft;
  title: string;
  sourceDraftFingerprint: string;
}) => Promise<EventPlanActionResult<PersistedEventPlan>>;

type UpdateAccountPlan = (input: {
  planId: string;
  draft: EventPlanDraft;
  title: string;
}) => Promise<EventPlanActionResult<PersistedEventPlan>>;

export type EventPlanAccountSaveResult =
  | { success: true; data: PersistedEventPlan; mode: "created" | "updated" }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

function validationError(): EventPlanAccountSaveResult {
  return {
    success: false,
    error: "Complete the required event plan fields before saving.",
  };
}

export async function saveEventPlanToAccount({
  draft,
  savedPlanId,
  create,
  update,
  storage,
}: {
  draft: EventPlanDraft;
  savedPlanId?: string | null;
  create: CreateAccountPlan;
  update: UpdateAccountPlan;
  storage?: Storage | null;
}): Promise<EventPlanAccountSaveResult> {
  const parsed = eventPlanPersistenceSchema.safeParse(draft);
  if (!parsed.success) return validationError();

  const title = buildEventPlanTitle(parsed.data);
  const storageOptions = storage === undefined ? undefined : { storage };

  if (savedPlanId) {
    const result = await update({
      planId: savedPlanId,
      draft: parsed.data,
      title,
    });

    if (!result.success) {
      saveEventPlanDraft(parsed.data, storageOptions);
      return result;
    }

    clearEventPlanDraft(storageOptions);
    clearEventPlanPendingSave(storageOptions);
    return { success: true, data: result.data, mode: "updated" };
  }

  const sourceDraftFingerprint = createEventPlanDraftFingerprint(parsed.data);
  const result = await create({
    draft: parsed.data,
    sourceDraftFingerprint,
    title,
  });

  if (!result.success) {
    saveEventPlanDraft(parsed.data, storageOptions);
    saveEventPlanPendingSave({ sourceDraftFingerprint }, storageOptions);
    return result;
  }

  clearEventPlanDraft(storageOptions);
  clearEventPlanPendingSave(storageOptions);
  return { success: true, data: result.data, mode: "created" };
}
