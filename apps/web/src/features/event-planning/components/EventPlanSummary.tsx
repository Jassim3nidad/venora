"use client";

import { ArrowRight, Loader2, Pencil, Save } from "lucide-react";
import type {
  EventPlanDraft,
  EventPlanningStep,
} from "../domain/event-plan.types";
import {
  buildEventPlanSummarySections,
  buildEventPlanTitle,
} from "../utils/event-plan-summary";

export function EventPlanSummary({
  draft,
  onEdit,
  onSave,
  onFindVenues,
  isSaving,
  saveError,
  saveMessage,
}: {
  draft: EventPlanDraft;
  onEdit: (step: EventPlanningStep) => void;
  onSave: () => void;
  onFindVenues?: () => void;
  isSaving: boolean;
  saveError: string | null;
  saveMessage: string | null;
}) {
  const sections = buildEventPlanSummarySections(draft);
  const title = buildEventPlanTitle(draft);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-600">
          Review your planning answers
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This summary is based only on the details you entered. Save it to
          your Venora account when you want to keep planning across devices.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save event plan"}
          </button>
          {onFindVenues ? (
            <button
              type="button"
              onClick={onFindVenues}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              Find matching venues
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {saveMessage ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
          >
            {saveMessage}
          </p>
        ) : null}
        {saveError ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
          >
            {saveError}
          </p>
        ) : null}
      </div>

      {sections.map((section) => (
        <section
          key={section.id}
          id={`summary-${section.id}`}
          tabIndex={-1}
          className="rounded-lg border border-slate-200 bg-white p-4 outline-none focus:ring-2 focus:ring-blue-100"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-950">
              {section.title}
            </h2>
            <button
              type="button"
              onClick={() => onEdit(section.id)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            {section.items.map((item) => (
              <div
                key={`${section.id}-${item.label}`}
                className="border-t border-slate-100 pt-3"
              >
                <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  {item.label}
                </dt>
                <dd
                  className={[
                    "mt-1 text-sm leading-6",
                    item.isMissing ? "text-slate-500" : "font-semibold text-slate-950",
                  ].join(" ")}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
