"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  clearSupplierAvailabilityAction,
  setSupplierAvailabilityAction,
} from "../application/dashboard-actions";

type Manual = {
  id: string;
  date: string;
  status: "available" | "unavailable" | "blocked";
  reason: string | null;
};
type Job = {
  id: string;
  bookings: { event_date: string; venues: { name: string } | null } | null;
};

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
  const monthDate = new Date(`${month}-01T00:00:00`);
  const days = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Manual["status"]>("blocked");
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

  function choose(date: string) {
    setSelected(date);
    const entry = manualMap.get(date);
    setStatus(entry?.status ?? "blocked");
    setReason(entry?.reason ?? "");
    setError(null);
  }

  function navigate(date: Date) {
    router.push(
      `/dashboard/supplier/calendar?month=${format(date, "yyyy-MM")}`,
    );
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
      if (result.error) return setError(result.error.message);
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(subMonths(monthDate, 1))}
            className="h-10 rounded-xl border px-4 text-sm font-bold"
          >
            Previous
          </button>
          <h2 className="font-display text-lg font-black text-[#0f172a]">
            {format(monthDate, "MMMM yyyy")}
          </h2>
          <button
            type="button"
            onClick={() => navigate(addMonths(monthDate, 1))}
            className="h-10 rounded-xl border px-4 text-sm font-bold"
          >
            Next
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-bold uppercase text-[#64748b]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: getDay(startOfMonth(monthDate)) }).map(
            (_, index) => (
              <div key={`blank-${index}`} />
            ),
          )}
          {days.map((day) => {
            const date = format(day, "yyyy-MM-dd");
            const entry = manualMap.get(date);
            const job = jobMap.get(date);
            const tone = job
              ? "border-blue-300 bg-blue-50 text-blue-800"
              : entry?.status === "blocked"
                ? "border-slate-300 bg-slate-100 text-slate-700"
                : entry?.status === "unavailable"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : entry?.status === "available"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-[#e5e7eb] bg-white text-[#334155]";
            return (
              <button
                key={date}
                type="button"
                onClick={() => choose(date)}
                className={`aspect-square min-w-0 rounded-xl border p-1 text-sm font-bold transition hover:border-[#60a5fa] ${tone}`}
              >
                <span>{format(day, "d")}</span>
                <span className="hidden truncate text-[10px] font-semibold sm:block">
                  {job ? "Booked" : (entry?.status ?? "Available")}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-[#475569]">
          {[
            ["bg-emerald-100", "Available"],
            ["bg-red-100", "Unavailable"],
            ["bg-slate-200", "Blocked"],
            ["bg-blue-100", "Booked job"],
          ].map(([color, label]) => (
            <span key={label} className="flex items-center gap-2">
              <i className={`h-3 w-3 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-black text-[#0f172a]">
          Date availability
        </h2>
        {!selected ? (
          <p className="mt-3 text-sm text-[#64748b]">
            Select a date to manage its availability.
          </p>
        ) : jobMap.has(selected) ? (
          <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">
            This date contains a confirmed job and cannot be changed.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="font-bold text-[#334155]">
              {format(new Date(`${selected}T00:00:00`), "MMMM d, yyyy")}
            </p>
            <label className="block text-sm font-bold text-[#334155]">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Manual["status"])}
                className="mt-2 w-full rounded-2xl border border-[#dbe3ef] px-4 py-3"
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-[#334155]">
              Reason
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={300}
                className="mt-2 w-full rounded-2xl border border-[#dbe3ef] px-4 py-3"
                placeholder="Optional note"
              />
            </label>
            {error ? (
              <p className="text-sm font-semibold text-red-600">{error}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => save(false)}
                className="min-h-11 rounded-2xl bg-[#1d4ed8] px-4 text-sm font-bold text-white"
              >
                Save
              </button>
              {manualMap.has(selected) ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => save(true)}
                  className="min-h-11 rounded-2xl border px-4 text-sm font-bold"
                >
                  Clear override
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
