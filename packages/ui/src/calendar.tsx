"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@venora/lib";

export type CalendarAvailabilityStatus =
  "available" | "reserved" | "tentative" | "maintenance" | "blackout";

interface CalendarProps {
  className?: string;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  availability?: Record<string, CalendarAvailabilityStatus>;
  disablePastDates?: boolean;
  currentMonth?: Date;
  onMonthChange?: (month: Date) => void;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isPastDate(date: Date) {
  return (
    startOfLocalDay(date).getTime() < startOfLocalDay(new Date()).getTime()
  );
}

function isToday(date: Date) {
  return (
    startOfLocalDay(date).getTime() === startOfLocalDay(new Date()).getTime()
  );
}

export function Calendar({
  className,
  selectedDate,
  onDateSelect,
  availability = {},
  disablePastDates = false,
  currentMonth,
  onMonthChange,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(
    currentMonth ?? new Date(),
  );

  React.useEffect(() => {
    if (currentMonth) {
      setCurrentDate(currentMonth);
    }
  }, [currentMonth]);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Helper to format date key YYYY-MM-DD
  const formatDateKey = (day: number) => {
    const d = new Date(year, monthIndex, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Get total days in month
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  // Get first day of the week (0 = Sunday)
  const firstDayIndex = new Date(year, monthIndex, 1).getDay();

  const handlePrevMonth = () => {
    const nextMonth = new Date(year, monthIndex - 1, 1);
    if (onMonthChange) {
      onMonthChange(nextMonth);
      return;
    }
    setCurrentDate(nextMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(year, monthIndex + 1, 1);
    if (onMonthChange) {
      onMonthChange(nextMonth);
      return;
    }
    setCurrentDate(nextMonth);
  };

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const emptyPads = Array.from({ length: firstDayIndex }, (_, i) => i);

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <h4 className="font-semibold text-sm text-[var(--text-primary)]">
          {monthNames[monthIndex]} {year}
        </h4>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-transparent hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-transparent hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week Day Labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--text-muted)] pb-2">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Day Cells Matrix */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {emptyPads.map((pad) => (
          <div key={`pad-${pad}`} className="aspect-square" />
        ))}
        {daysArray.map((day) => {
          const key = formatDateKey(day);
          const status = availability[key] ?? "available";
          const date = new Date(year, monthIndex, day);
          const isPast = disablePastDates && isPastDate(date);
          const isUnavailable = status !== "available";
          const isDisabled = isPast || isUnavailable;

          const isSelected =
            selectedDate &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === monthIndex &&
            selectedDate.getFullYear() === year;

          const isTodayDate = isToday(date);

          let ariaLabel = `${monthNames[monthIndex]} ${day}, ${year}`;
          if (isPast) ariaLabel += ", past, not selectable";
          else if (status === "available") ariaLabel += ", available";
          else if (status === "reserved") ariaLabel += ", booked, not selectable";
          else if (status === "tentative") ariaLabel += ", pending request, not selectable";
          else if (status === "maintenance") ariaLabel += ", maintenance, not selectable";
          else if (status === "blackout") ariaLabel += ", unavailable, not selectable";

          let title = "";
          if (isPast) title = "Past date";
          else if (status === "available") title = "Available for booking";
          else if (status === "reserved") title = "This date is already booked.";
          else if (status === "tentative") title = "This date has a pending request and cannot be booked yet.";
          else if (status === "maintenance") title = "This date is unavailable due to maintenance.";
          else if (status === "blackout") title = "This date is unavailable.";

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={isDisabled}
              aria-disabled={isDisabled}
              aria-label={ariaLabel}
              title={title}
              onClick={() => {
                if (isDisabled) return;
                onDateSelect?.(date);
              }}
              className={cn(
                "w-full aspect-square rounded-full text-xs font-semibold flex flex-col items-center justify-center transition-all relative outline-none",
                isPast &&
                "cursor-not-allowed bg-[var(--bg-muted)] text-[var(--text-muted)] opacity-50",
                // Available
                !isPast &&
                status === "available" &&
                "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer",
                // Reserved
                !isPast &&
                status === "reserved" &&
                "cursor-not-allowed bg-[var(--color-brand-600)] text-white shadow-sm",
                // Tentative
                !isPast &&
                status === "tentative" &&
                "cursor-not-allowed border-2 border-dashed border-orange-400 text-orange-700 bg-orange-50",
                // Maintenance
                !isPast &&
                status === "maintenance" &&
                "cursor-not-allowed bg-slate-200 text-slate-500",
                // Blackout
                !isPast &&
                status === "blackout" &&
                "cursor-not-allowed bg-red-50 text-red-500 border border-red-100",
                // Selected override
                isSelected &&
                "ring-2 ring-[var(--color-brand-600)] ring-offset-2",
                // Today indicator
                isTodayDate && !isSelected &&
                "ring-1 ring-[var(--border-default)] ring-offset-1 font-bold"
              )}
            >
              <span>{day}</span>
              {!isPast && status === "available" && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--color-success)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Status Legend */}
      <div className="mt-4 pt-4 border-t border-[var(--border-default)] flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-[var(--text-secondary)] justify-center">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center justify-center h-4 w-4 relative">
            <div className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          </div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full border-2 border-dashed border-orange-400 bg-orange-50" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[var(--color-brand-600)]" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-slate-200" />
          <span>Maintenance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-50 border border-red-100" />
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
}
