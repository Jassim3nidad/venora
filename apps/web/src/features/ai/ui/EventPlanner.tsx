"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { generateEventPlanAction } from "../application/actions";
import type { AIEventPlanResult } from "../application/ai-planner";

const EVENT_TYPES = [
  "Wedding",
  "Birthday",
  "Debut",
  "Corporate Event",
  "Christening",
  "Reunion",
  "Other",
];

const fieldClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function EventPlanner() {
  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState<AIEventPlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const preferredCity = String(formData.get("preferredCity") ?? "").trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();

    setError(null);
    startTransition(async () => {
      const result = await generateEventPlanAction({
        eventType: String(formData.get("eventType") ?? ""),
        guestCount: Number(formData.get("guestCount")),
        budgetAmount: Number(formData.get("budgetAmount")),
        preferredCity: preferredCity || undefined,
        eventDate: eventDate || undefined,
      });

      if (result.error) {
        setPlan(null);
        setError(result.error.message);
        return;
      }

      setPlan(result.data.plan);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
              Planning assistant
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Build your event plan
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Get a practical milestone, supplier-service, and budget outline.
              Review every recommendation before making a booking.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-800">
              Event type
              <select
                name="eventType"
                required
                defaultValue=""
                className={fieldClass}
              >
                <option value="" disabled>
                  Select an event type
                </option>
                {EVENT_TYPES.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-800">
              Guest count
              <input
                name="guestCount"
                type="number"
                min={1}
                required
                placeholder="150"
                className={fieldClass}
              />
            </label>

            <label className="text-sm font-bold text-slate-800">
              Total budget (PHP)
              <input
                name="budgetAmount"
                type="number"
                min={1000}
                step={1000}
                required
                placeholder="300000"
                className={fieldClass}
              />
            </label>

            <label className="text-sm font-bold text-slate-800">
              Preferred city
              <input
                name="preferredCity"
                type="text"
                placeholder="Tagaytay"
                className={fieldClass}
              />
            </label>

            <label className="text-sm font-bold text-slate-800 sm:col-span-2">
              Event date
              <input name="eventDate" type="date" className={fieldClass} />
            </label>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? "Building plan..." : "Generate event plan"}
          </button>
        </form>
      </section>

      {plan ? (
        <section aria-live="polite" className="space-y-5">
          {plan.fallbackUsed ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Live AI guidance is unavailable, so Venora generated this outline
              from its planning template.
            </p>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <CalendarDays
                  className="h-5 w-5 text-blue-600"
                  aria-hidden="true"
                />
                Recommended milestones
              </h3>
              <ol className="mt-5 space-y-4">
                {plan.recommendedMilestones.map((milestone, index) => (
                  <li
                    key={`${milestone.title}-${index}`}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      {milestone.timeline} · {milestone.category}
                    </p>
                    <p className="mt-1 font-bold text-slate-900">
                      {milestone.title}
                    </p>
                  </li>
                ))}
              </ol>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <WalletCards
                  className="h-5 w-5 text-blue-600"
                  aria-hidden="true"
                />
                Suggested budget
              </h3>
              <ul className="mt-5 space-y-3">
                {plan.budgetAllocation.map((allocation, index) => (
                  <li
                    key={`${allocation.category}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {allocation.category}
                      </p>
                      <p className="text-xs text-slate-500">
                        {allocation.percentage}% of budget
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-slate-950">
                      {formatCurrency(allocation.estimatedAmount)}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-950">
              Services to consider
            </h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {plan.suggestedServices.map((service, index) => (
                <li
                  key={`${service}-${index}`}
                  className="flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-blue-600"
                    aria-hidden="true"
                  />
                  {service}
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </div>
  );
}
