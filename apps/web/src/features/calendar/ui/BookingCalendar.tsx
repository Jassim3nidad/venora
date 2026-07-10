"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { DateEditorModal } from "./DateEditorModal";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";
import { useCalendar } from "../hooks/use-calendar";
import {
  AVAILABILITY_BADGE_CLASSES,
  AVAILABILITY_LABELS,
} from "../utils/availability";

type OwnerCalendarVenue = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
};

type BookingCalendarProps = {
  venues: OwnerCalendarVenue[];
};

const LEGEND_STATUSES = [
  "available",
  "tentative",
  "reserved",
  "maintenance",
  "blackout",
] as const;

export default function BookingCalendar({ venues }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [venueId, setVenueId] = useState<string>(venues[0]?.id ?? "");

  useEffect(() => {
    if (venues.length > 0 && !venues.some((venue) => venue.id === venueId)) {
      setVenueId(venues[0]?.id ?? "");
    }
  }, [venueId, venues]);

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === venueId) ?? venues[0] ?? null,
    [venueId, venues],
  );

  const { isLoading, getAvailabilityForDay, getBookingsForDay } = useCalendar(
    venueId,
    currentMonth,
  );

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setIsEditorOpen(true);
  };

  if (venues.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center text-[#64748b]">
        <CalendarDays className="mx-auto mb-4 h-12 w-12 text-[#94a3b8]" />
        <p className="font-display text-lg font-black text-[#0f172a]">
          No venues yet
        </p>
        <p className="mt-2 text-sm font-medium">
          Add a venue first before managing availability.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-[#e5e7eb] bg-white p-4 shadow-sm shadow-slate-200/60 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 shadow-lg shadow-blue-200">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-black tracking-tight text-[#0f172a]">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <p className="text-sm font-medium text-[#64748b]">
              {selectedVenue
                ? `Managing ${selectedVenue.name}`
                : "Choose a venue to manage availability."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-[#64748b]">
            Venue
            <select
              value={venueId}
              onChange={(event) => {
                setVenueId(event.target.value);
                setSelectedDay(null);
                setIsEditorOpen(false);
              }}
              className="h-11 min-w-[260px] rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold normal-case tracking-normal text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            >
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2 rounded-2xl border border-[#dbe3ef] bg-[#f8fbff] p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="rounded-xl p-2 transition-colors hover:bg-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4 text-[#334155]" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date())}
              className="rounded-xl px-4 py-2 text-sm font-black text-[#334155] transition-colors hover:bg-white"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-xl p-2 transition-colors hover:bg-white"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4 text-[#334155]" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[#e5e7eb] bg-white p-3 text-xs font-black uppercase tracking-wide text-[#64748b] shadow-sm shadow-slate-200/60">
        {LEGEND_STATUSES.map((status) => (
          <span
            key={status}
            className={`inline-flex rounded-full px-3 py-1 ${AVAILABILITY_BADGE_CLASSES[status]}`}
          >
            {AVAILABILITY_LABELS[status]}
          </span>
        ))}
        <span className="ml-auto normal-case tracking-normal text-[#2563eb]">
          Click a future date to block, unblock, or mark maintenance.
        </span>
      </div>

      <div className="relative rounded-[24px] border border-[#e5e7eb] bg-white p-4 shadow-sm shadow-slate-200/60">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-white/70 text-[#64748b] backdrop-blur-sm">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#2563eb]" />
            Loading calendar data...
          </div>
        ) : null}
        <CalendarGrid
          venueId={venueId}
          currentMonth={currentMonth}
          onDayClick={handleDayClick}
          disablePastDates
        />
      </div>

      <DateEditorModal
        venueId={venueId}
        isOpen={isEditorOpen}
        date={selectedDay}
        availability={
          selectedDay ? getAvailabilityForDay(selectedDay) : undefined
        }
        bookings={selectedDay ? getBookingsForDay(selectedDay) : []}
        onClose={() => setIsEditorOpen(false)}
      />
    </div>
  );
}
