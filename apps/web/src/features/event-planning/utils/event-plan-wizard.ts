import {
  createDefaultEventPlanDraft,
  EVENT_PLANNING_STEPS,
} from "../domain/event-plan.constants";
import type {
  EventPlanDraft,
  EventPlanningStep,
} from "../domain/event-plan.types";
import {
  bookingPreferencesStepSchema,
  dateLocationStepSchema,
  eventBasicsStepSchema,
  guestsBudgetStepSchema,
  requirementsStepSchema,
  servicesStepSchema,
  venueStyleStepSchema,
} from "../schemas/event-plan.schema";

export type EventPlanFieldErrors = Record<string, string[]>;

export type WizardStepValidationResult =
  | { success: true; draft: EventPlanDraft }
  | { success: false; fieldErrors: EventPlanFieldErrors };

export const QUESTIONNAIRE_STEPS = EVENT_PLANNING_STEPS.filter(
  (step) => step.id !== "summary",
);

export function getStepIndex(step: EventPlanningStep) {
  return EVENT_PLANNING_STEPS.findIndex((item) => item.id === step);
}

export function isEventPlanningStep(value: unknown): value is EventPlanningStep {
  return (
    typeof value === "string" &&
    EVENT_PLANNING_STEPS.some((step) => step.id === value)
  );
}

export function getSafeCurrentStep(value: unknown): EventPlanningStep {
  return isEventPlanningStep(value) ? value : "event-basics";
}

export function getNextStep(step: EventPlanningStep): EventPlanningStep {
  const index = getStepIndex(step);
  return (
    EVENT_PLANNING_STEPS[
      Math.min(index + 1, EVENT_PLANNING_STEPS.length - 1)
    ]?.id ?? "summary"
  );
}

export function getPreviousStep(step: EventPlanningStep): EventPlanningStep {
  const index = getStepIndex(step);
  return EVENT_PLANNING_STEPS[Math.max(index - 1, 0)]?.id ?? "event-basics";
}

export function isFirstStep(step: EventPlanningStep) {
  return getStepIndex(step) === 0;
}

export function isSummaryStep(step: EventPlanningStep) {
  return step === "summary";
}

export function markStepComplete(
  draft: EventPlanDraft,
  step: EventPlanningStep,
): EventPlanDraft {
  const completedSteps = EVENT_PLANNING_STEPS.map((item) => item.id).filter(
    (id) => id === step || draft.completedSteps.includes(id),
  );

  return { ...draft, completedSteps };
}

function flattenFieldErrors(error: { flatten: () => { fieldErrors: EventPlanFieldErrors } }) {
  return error.flatten().fieldErrors;
}

export function validateEventPlanStep(
  draft: EventPlanDraft,
  step: EventPlanningStep,
): WizardStepValidationResult {
  if (step === "summary") return { success: true, draft };

  const result =
    step === "event-basics"
      ? eventBasicsStepSchema.safeParse(draft)
      : step === "date-location"
        ? dateLocationStepSchema.safeParse(draft)
        : step === "guests-budget"
          ? guestsBudgetStepSchema.safeParse(draft)
          : step === "venue-style"
            ? venueStyleStepSchema.safeParse(draft)
            : step === "requirements"
              ? requirementsStepSchema.safeParse(draft)
              : step === "services"
                ? servicesStepSchema.safeParse(draft)
                : bookingPreferencesStepSchema.safeParse(draft);

  if (!result.success) {
    return { success: false, fieldErrors: flattenFieldErrors(result.error) };
  }

  return {
    success: true,
    draft: {
      ...draft,
      ...result.data,
    },
  };
}

export function resetEventPlanWizard(now = new Date()): EventPlanDraft {
  return createDefaultEventPlanDraft(now.toISOString());
}

export function applyDraftPatch(
  draft: EventPlanDraft,
  patch: Partial<EventPlanDraft>,
  now = new Date(),
): EventPlanDraft {
  return {
    ...draft,
    ...patch,
    updatedAt: now.toISOString(),
  };
}

export function getFirstErrorField(fieldErrors: EventPlanFieldErrors) {
  return Object.keys(fieldErrors).find((key) => fieldErrors[key]?.length);
}

export function getProgressValue(step: EventPlanningStep) {
  return {
    current: getStepIndex(step) + 1,
    total: EVENT_PLANNING_STEPS.length,
  };
}
