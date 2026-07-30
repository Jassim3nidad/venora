"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import {
  createDefaultEventPlanDraft,
  EVENT_PLANNING_STEPS,
} from "../domain/event-plan.constants";
import type {
  EventPlanDraft,
  EventPlanningStep,
} from "../domain/event-plan.types";
import {
  clearEventPlanDraft,
  loadEventPlanDraft,
  saveEventPlanDraft,
} from "../utils/event-plan-draft";
import {
  applyDraftPatch,
  getFirstErrorField,
  getNextStep,
  getPreviousStep,
  getProgressValue,
  isFirstStep,
  markStepComplete,
  resetEventPlanWizard,
  validateEventPlanStep,
  type EventPlanFieldErrors,
} from "../utils/event-plan-wizard";
import { BookingPreferencesStep } from "./BookingPreferencesStep";
import { DateLocationStep } from "./DateLocationStep";
import { EventBasicsStep } from "./EventBasicsStep";
import { EventPlanningProgress } from "./EventPlanningProgress";
import {
  EventPlanSaveStatus,
  type EventPlanSaveState,
} from "./EventPlanSaveStatus";
import { EventPlanSummary } from "./EventPlanSummary";
import { GuestsBudgetStep } from "./GuestsBudgetStep";
import { RequirementsStep } from "./RequirementsStep";
import { ServicesStep } from "./ServicesStep";
import { StartOverDialog } from "./StartOverDialog";
import { VenueStyleStep } from "./VenueStyleStep";

const STEP_COPY: Record<EventPlanningStep, { title: string; body: string }> = {
  "event-basics": {
    title: "Event Basics",
    body: "Start with the kind of celebration you are planning.",
  },
  "date-location": {
    title: "Date and Location",
    body: "Share what you know about timing and preferred area.",
  },
  "guests-budget": {
    title: "Guests and Budget",
    body: "Estimate the scale and budget so later venue options can be realistic.",
  },
  "venue-style": {
    title: "Venue Style",
    body: "Choose the atmosphere, setting, and priorities that matter most.",
  },
  requirements: {
    title: "Facilities and Requirements",
    body: "List practical venue features you need for the event.",
  },
  services: {
    title: "Services Needed",
    body: "Note which event services you may still need help with.",
  },
  "booking-preferences": {
    title: "Booking Preferences",
    body: "Add optional preferences for packages, suppliers, payment, and timing.",
  },
  summary: {
    title: "Event Plan Summary",
    body: "Review your answers before the next phase adds account saving and venue search handoff.",
  },
};

function firstStepErrorMessage(fieldErrors: EventPlanFieldErrors) {
  const field = getFirstErrorField(fieldErrors);
  return field ? fieldErrors[field]?.[0] : null;
}

function focusField(field: string) {
  window.setTimeout(() => {
    const target = document.querySelector<HTMLElement>(
      `[data-field-name="${field}"]`,
    );
    target?.focus();
  }, 0);
}

export function EventPlanningWizard() {
  const [draft, setDraft] = useState<EventPlanDraft>(() =>
    createDefaultEventPlanDraft(),
  );
  const [fieldErrors, setFieldErrors] = useState<EventPlanFieldErrors>({});
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<EventPlanSaveState>("idle");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasPendingLocalSave, setHasPendingLocalSave] = useState(false);
  const [returnToSummary, setReturnToSummary] = useState(false);
  const [summaryFocusStep, setSummaryFocusStep] =
    useState<EventPlanningStep | null>(null);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const startOverTriggerRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const currentStep = draft.currentStep;
  const currentCopy = STEP_COPY[currentStep];
  const progress = getProgressValue(currentStep);
  const firstError = firstStepErrorMessage(fieldErrors);

  useEffect(() => {
    const result = loadEventPlanDraft();

    if (result.status === "loaded") {
      setDraft(result.draft);
      setSaveState("restored");
      setRestoreMessage("Planning session restored.");
    } else if (result.status === "invalid") {
      setRestoreMessage(
        "We could not restore your previous planning session. You can begin a new plan.",
      );
      clearEventPlanDraft();
      setSaveState("idle");
    } else if (result.status === "unavailable") {
      setSaveState("error");
    }

    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !hasPendingLocalSave) return;

    setSaveState("saving");
    const timeoutId = window.setTimeout(() => {
      const result = saveEventPlanDraft(draft);
      setSaveState(result.success ? "saved" : "error");
      setHasPendingLocalSave(false);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [draft, hasHydrated, hasPendingLocalSave]);

  useEffect(() => {
    if (summaryFocusStep && currentStep === "summary") {
      window.setTimeout(() => {
        document.getElementById(`summary-${summaryFocusStep}`)?.focus();
      }, 0);
      setSummaryFocusStep(null);
      return;
    }

    window.setTimeout(() => headingRef.current?.focus(), 0);
  }, [currentStep, summaryFocusStep]);

  const updateDraft = (patch: Partial<EventPlanDraft>) => {
    setDraft((current) => applyDraftPatch(current, patch));
    setFieldErrors({});
    setRestoreMessage(null);
    setHasPendingLocalSave(true);
  };

  const persistTransition = (nextDraft: EventPlanDraft) => {
    setDraft(nextDraft);
    setHasPendingLocalSave(true);
    setFieldErrors({});
  };

  const goNext = () => {
    const validation = validateEventPlanStep(draft, currentStep);

    if (!validation.success) {
      setFieldErrors(validation.fieldErrors);
      const firstField = getFirstErrorField(validation.fieldErrors);
      if (firstField) focusField(firstField);
      return;
    }

    const completedDraft = markStepComplete(validation.draft, currentStep);
    const nextStep =
      returnToSummary || currentStep === "booking-preferences"
        ? "summary"
        : getNextStep(currentStep);

    persistTransition(
      applyDraftPatch(completedDraft, {
        currentStep: nextStep,
        completedSteps: markStepComplete(completedDraft, currentStep)
          .completedSteps,
      }),
    );

    if (returnToSummary) {
      setSummaryFocusStep(currentStep);
      setReturnToSummary(false);
    }
  };

  const goPrevious = () => {
    const previousStep = getPreviousStep(currentStep);
    persistTransition(applyDraftPatch(draft, { currentStep: previousStep }));
  };

  const goToEditStep = (step: EventPlanningStep) => {
    setReturnToSummary(true);
    persistTransition(applyDraftPatch(draft, { currentStep: step }));
  };

  const cancelStartOver = () => {
    setStartOverOpen(false);
    window.setTimeout(() => startOverTriggerRef.current?.focus(), 0);
  };

  const confirmStartOver = () => {
    clearEventPlanDraft();
    setDraft(resetEventPlanWizard());
    setFieldErrors({});
    setRestoreMessage(null);
    setSaveState("idle");
    setHasPendingLocalSave(false);
    setReturnToSummary(false);
    setSummaryFocusStep(null);
    setStartOverOpen(false);
  };

  const stepBody = useMemo(() => {
    const props = {
      draft,
      errors: fieldErrors,
      onChange: updateDraft,
    };

    if (currentStep === "event-basics") return <EventBasicsStep {...props} />;
    if (currentStep === "date-location") return <DateLocationStep {...props} />;
    if (currentStep === "guests-budget") return <GuestsBudgetStep {...props} />;
    if (currentStep === "venue-style") return <VenueStyleStep {...props} />;
    if (currentStep === "requirements") return <RequirementsStep {...props} />;
    if (currentStep === "services") return <ServicesStep {...props} />;
    if (currentStep === "booking-preferences") {
      return <BookingPreferencesStep {...props} />;
    }

    return <EventPlanSummary draft={draft} onEdit={goToEditStep} />;
  }, [currentStep, draft, fieldErrors]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-lg font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              Venora
            </Link>
            <p className="mt-1 text-sm text-slate-600">
              Plan locally on this device. Account saving comes in the next
              phase.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <EventPlanSaveStatus state={saveState} />
            <Link
              href="/venues"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              Exit to venues
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 lg:sticky lg:top-6">
            <EventPlanningProgress
              currentStep={currentStep}
              completedSteps={draft.completedSteps}
            />
          </aside>

          <main className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
              <p className="text-sm font-bold text-slate-600">
                Step {progress.current} of {progress.total}
              </p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-2 text-2xl font-bold tracking-tight text-slate-950 outline-none sm:text-3xl"
              >
                {currentCopy.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {currentCopy.body}
              </p>
              {restoreMessage ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  {restoreMessage}
                </p>
              ) : null}
              {firstError ? (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                >
                  {firstError}
                </div>
              ) : null}
            </div>

            <div className="px-4 py-6 sm:px-6">{stepBody}</div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                ref={startOverTriggerRef}
                type="button"
                onClick={() => setStartOverOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <RotateCcw className="h-4 w-4" />
                Start over
              </button>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={isFirstStep(currentStep)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>
                {currentStep === "summary" ? (
                  <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">
                    Review complete
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {returnToSummary ? "Return to summary" : "Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <StartOverDialog
        open={startOverOpen}
        onCancel={cancelStartOver}
        onConfirm={confirmStartOver}
      />
    </div>
  );
}
