import { describe, expect, it } from "vitest";
import {
  createDefaultEventPlanDraft,
  EVENT_PLANNING_STEPS,
} from "../domain/event-plan.constants";
import {
  applyDraftPatch,
  getNextStep,
  getPreviousStep,
  getSafeCurrentStep,
  markStepComplete,
  resetEventPlanWizard,
  validateEventPlanStep,
} from "./event-plan-wizard";
import type { EventPlanDraft } from "../domain/event-plan.types";

describe("event planning wizard state", () => {
  it("uses the approved step order and falls back from invalid step values", () => {
    expect(EVENT_PLANNING_STEPS.map((step) => step.id)).toEqual([
      "event-basics",
      "date-location",
      "guests-budget",
      "venue-style",
      "requirements",
      "services",
      "booking-preferences",
      "summary",
    ]);

    expect(getSafeCurrentStep("missing")).toBe("event-basics");
    expect(getSafeCurrentStep("summary")).toBe("summary");
  });

  it("moves forward and backward without losing draft answers", () => {
    const draft = applyDraftPatch(createDefaultEventPlanDraft(), {
      eventType: "wedding",
      currentStep: "event-basics",
    });

    expect(getNextStep(draft.currentStep)).toBe("date-location");
    expect(getPreviousStep("date-location")).toBe("event-basics");
    expect(draft.eventType).toBe("wedding");
  });

  it("blocks invalid continue and accepts valid event basics", () => {
    const emptyDraft = createDefaultEventPlanDraft();
    const invalid = validateEventPlanStep(emptyDraft, "event-basics");
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.fieldErrors.eventType?.[0]).toBe("Choose an event type");
    }

    const valid = validateEventPlanStep(
      { ...emptyDraft, eventType: "debut" },
      "event-basics",
    );
    expect(valid.success).toBe(true);
  });

  it("tracks completed steps once in approved order", () => {
    const draft: EventPlanDraft = {
      ...createDefaultEventPlanDraft(),
      completedSteps: ["date-location", "event-basics"],
    };

    expect(markStepComplete(draft, "event-basics").completedSteps).toEqual([
      "event-basics",
      "date-location",
    ]);
  });

  it("resets to a fresh first-step draft for start over", () => {
    const reset = resetEventPlanWizard(new Date("2099-01-01T00:00:00.000Z"));

    expect(reset.currentStep).toBe("event-basics");
    expect(reset.completedSteps).toEqual([]);
    expect(reset.updatedAt).toBe("2099-01-01T00:00:00.000Z");
  });
});
