"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { isPastDate } from "@/src/lib/date-only";
import {
  clearSupplierAvailabilityAction,
  setSupplierAvailabilityAction,
} from "../application/dashboard-actions";

type ManualStatus = "available" | "unavailable" | "blocked";

type Manual = {
  id: string;
  date: string;
  status: ManualStatus;
  reason: string | null;
};

type Job = {
  id: string;
  bookings: { event_date: string; venues: { name: string } | null } | null;
};

type DayTone = ManualStatus | "booked" | "default";

const LEGEND: Array<{ tone: DayTone; label: string }> = [
  { tone: "available", label: "Available" },
  { tone: "unavailable", label: "Unavailable" },
  { tone: "blocked", label: "Blocked" },
  { tone: "booked", label: "Booked job" },
];

const BADGE_CLASSES: Record<DayTone, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  unavailable: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  blocked: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  booked: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  default: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
};

const CELL_CLASSES: Record<DayTone, string> = {
  available: "border-emerald-100 bg-white",
  unavailable: "border-orange-200 bg-orange-50",
  blocked: "border-slate-300 bg-slate-100",
  booked: "border-blue-200 bg-blue-50",
  default: "border-[#e5e7eb] bg-white",
};

const STATUS_LABELS: Record<DayTone, string> = {
  available: "Available",
  unavailable: "Unavailable",
  blocked: "Blocked",
  booked: "Booked",
  default: "Open",
};

function dayTone(entry: Manual | undefined, job: Job | undefined): DayTone {
  if (job) return "booked";
  if (entry?.status) return entry.status;
  return "default";
}

export function SupplierAvailabilityCalendar({
  month,
  manual,
  jobs,
}: {
  month: string;
  manual: Manual[];
  jobs: Job[];
}) {
  const router = useRouter();
  const monthDate = useMemo(() => new Date(`${month}-01T00:00:00`), [month]);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<ManualStatus>("blocked");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const manualMap = useMemo(
    () => new Map(manual.map((entry) => [entry.date, entry])),
    [manual],
  );
  const jobMap = useMemo(
    () =>
      new Map(
        jobs
          .filter((job) => job.bookings?.event_date)
          .map((job) => [job.bookings!.event_date, job]),
      ),
    [jobs],
  );

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(monthDate)),
        end: endOfWeek(endOfMonth(monthDate)),
      }),
    [monthDate],
  );

  function navigate(date: Date) {
    router.push(
      `/dashboard/supplier/calendar?month=${format(date, "yyyy-MM")}`,
    );
  }

  function choose(day: Date) {
    if (isPastDate(day)) return;
    const date = format(day, "yyyy-MM-dd");
    setSelected(date);
    const entry = manualMap.get(date);
    setStatus(entry?.status ?? "blocked");
    setReason(entry?.reason ?? "");
    setError(null);
  }

  function closeEditor() {
    setSelected(null);
    setError(null);
  }

  function save(clear = false) {
    if (!selected) return;
    startTransition(async () => {
      const result = clear
        ? await clearSupplierAvailabilityAction({ date: selected })
        : await setSupplierAvailabilityAction({
            date: selected,
            status,
            reason,
          });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      closeEditor();
      router.refresh();
    });
  }

  const selectedJob = selected ? jobMap.get(selected) : undefined;
  const selectedEntry = selected ? manualMap.get(selected) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-[#e5e7eb] bg-white p-4 shadow-sm shadow-slate-200/60 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 shadow-lg shadow-blue-200">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-black tracking-tight text-[#0f172a]">
              {format(monthDate, "MMMM yyyy")}
            </h2>
            <p className="text-sm font-medium text-[#64748b]">
              Manage the dates your business can accept work.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[#dbe3ef] bg-[#f8fbff] p-1 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(subMonths(monthDate, 1))}
            className="rounded-xl p-2 transition-colors hover:bg-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4 text-[#334155]" />
          </button>
          <button
            type="button"
            onClick={() => navigate(new Date())}
            className="rounded-xl px-4 py-2 text-sm font-black text-[#334155] transition-colors hover:bg-white"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigate(addMonths(monthDate, 1))}
            className="rounded-xl p-2 transition-colors hover:bg-white"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4 text-[#334155]" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#e5e7eb] bg-white p-3 text-xs font-black uppercase tracking-wide text-[#64748b] shadow-sm shadow-slate-200/60">
        {LEGEND.map(({ tone, label }) => (
          <span
            key={tone}
            className={`inline-flex rounded-full px-3 py-1 ${BADGE_CLASSES[tone]}`}
          >
            {label}
          </span>
        ))}
        <span className="ml-auto normal-case tracking-normal text-[#2563eb]">
          Click a future date to block, unblock, or mark unavailable.
        </span>
      </div>

      <div className="relative rounded-[24px] border border-[#e5e7eb] bg-white p-4 shadow-sm shadow-slate-200/60">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const date = format(day, "yyyy-MM-dd");
            const entry = manualMap.get(date);
            const job = jobMap.get(date);
            const tone = dayTone(entry, job);
            const inMonth = isSameMonth(day, monthDate);
            const disabled = !inMonth || isPastDate(day);
            const today = isToday(day);

            let bgClass = inMonth
              ? CELL_CLASSES[tone]
              : "border-gray-100 bg-gray-50";
            let opacityClass = inMonth ? "opacity-100" : "opacity-40";
            let borderClass = "border";

            if (disabled) {
              bgClass = "bg-gray-50";
              opacityClass = "opacity-50";
              borderClass = "border border-gray-200";
            }

            return (
              <button
                key={date}
                type="button"
                disabled={disabled}
                onClick={() => choose(day)}
                aria-disabled={disabled}
                className={`relative flex min-h-[120px] flex-col overflow-hidden rounded-2xl p-2 text-left transition-colors ${bgClass} ${opacityClass} ${borderClass} ${
                  disabled
                    ? "cursor-not-allowed text-gray-400"
                    : "cursor-pointer hover:border-blue-300"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      disabled
                        ? "text-gray-400"
                        : today
                          ? "bg-blue-600 text-white"
                          : inMonth
                            ? "text-gray-700"
                            : "text-gray-400"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {tone !== "default" && inMonth ? (
                    <span
                      className={`truncate rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${BADGE_CLASSES[tone]}`}
                    >
                      {STATUS_LABELS[tone]}
                    </span>
                  ) : null}
                </div>

                {job?.bookings?.venues?.name && inMonth && !disabled ? (
                  <div className="mt-auto truncate rounded-lg bg-white/80 px-2 py-1 text-[10px] font-bold text-blue-800">
                    {job.bookings.venues.name}
                  </div>
                ) : entry?.reason && inMonth && !disabled ? (
                  <div className="mt-auto truncate text-[10px] font-semibold text-[#64748b]">
                    {entry.reason}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] bg-[#f8fbff] p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#2563eb]">
                  Supplier availability
                </p>
                <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-black text-[#0f172a]">
                  <Calendar className="h-5 w-5 text-[#2563eb]" />
                  {format(new Date(`${selected}T00:00:00`), "MMMM d, yyyy")}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl p-2 text-[#64748b] transition hover:bg-white"
                aria-label="Close date editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 p-5">
              {selectedJob ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-black text-amber-800">
                    This date contains a confirmed job and cannot be changed.
                  </p>
                  {selectedJob.bookings?.venues?.name ? (
                    <p className="mt-2 text-sm font-semibold text-amber-800">
                      Venue: {selectedJob.bookings.venues.name}
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <label
                      htmlFor="supplier-availability-status"
                      className="text-sm font-black text-[#334155]"
                    >
                      Date status
                    </label>
                    <select
                      id="supplier-availability-status"
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as ManualStatus)
                      }
                      className="h-12 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    <p className="text-xs font-semibold text-[#64748b]">
                      Blocked and unavailable dates stop new customer requests
                      for this day.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label
                      htmlFor="supplier-availability-reason"
                      className="text-sm font-black text-[#334155]"
                    >
                      Reason or internal note
                    </label>
                    <textarea
                      id="supplier-availability-reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={4}
                      maxLength={300}
                      placeholder="Example: Private event, travel day, staff unavailable"
                      className="resize-none rounded-2xl border border-[#dbe3ef] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
                    />
                  </div>

                  {error ? (
                    <p className="text-sm font-semibold text-red-600">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 border-t border-[#e5e7eb] pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeEditor}
                      disabled={isPending}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#334155] transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
                    >
                      Cancel
                    </button>
                    {selectedEntry ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => save(true)}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Clear / Unblock
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => save(false)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm shadow-blue-200/70 transition hover:bg-[#1e40af] disabled:opacity-60"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Save
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
