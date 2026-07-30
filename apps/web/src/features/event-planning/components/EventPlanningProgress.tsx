"use client";

import { CheckCircle2 } from "lucide-react";
import {
  EVENT_PLANNING_STEPS,
} from "../domain/event-plan.constants";
import type {
  EventPlanDraft,
  EventPlanningStep,
} from "../domain/event-plan.types";
import { getProgressValue, getStepIndex } from "../utils/event-plan-wizard";

export function EventPlanningProgress({
  currentStep,
  completedSteps,
}: {
  currentStep: EventPlanningStep;
  completedSteps: EventPlanDraft["completedSteps"];
}) {
  const progress = getProgressValue(currentStep);
  const currentIndex = getStepIndex(currentStep);

  return (
    <nav aria-label="Event planning progress" className="space-y-3">
      <p className="text-sm font-bold text-slate-700" aria-live="polite">
        Step {progress.current} of {progress.total}
      </p>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {EVENT_PLANNING_STEPS.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isComplete = completedSteps.includes(step.id);

          return (
            <li key={step.id}>
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition",
                  isCurrent
                    ? "border-blue-600 bg-blue-50 font-bold text-blue-700"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50 font-bold text-emerald-700"
                      : index < currentIndex
                        ? "border-slate-200 bg-white text-slate-600"
                        : "border-slate-200 bg-white text-slate-500",
                ].join(" ")}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current text-xs font-bold">
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </span>
                <span>{step.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
