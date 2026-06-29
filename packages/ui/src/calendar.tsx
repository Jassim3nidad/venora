"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@venora/lib";

export type CalendarAvailabilityStatus =
  | "available"
  | "reserved"
  | "tentative"
  | "maintenance"
  | "blackout";

interface CalendarProps {
  className?: string;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  availability?: Record<string, CalendarAvailabilityStatus>;
}

export function Calendar({
  className,
  selectedDate,
  onDateSelect,
  availability = {},
}: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper to format date key YYYY-MM-DD
  const formatDateKey = (day: number) => {
    const d = new Date(year, month, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Get total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Get first day of the week (0 = Sunday)
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const emptyPads = Array.from({ length: firstDayIndex }, (_, i) => i);

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <h4 className="font-semibold text-sm text-[var(--text-primary)]">
          {monthNames[month]} {year}
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

          const isSelected =
            selectedDate &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === month &&
            selectedDate.getFullYear() === year;

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => onDateSelect?.(new Date(year, month, day))}
              className={cn(
                "aspect-square rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative",
                // Available
                status === "available" && "border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]",
                // Reserved
                status === "reserved" && "bg-[var(--color-success)] text-white",
                // Tentative
                status === "tentative" && "border-2 border-dashed border-[var(--color-warning)] text-[var(--color-warning)]",
                // Maintenance
                status === "maintenance" && "bg-[var(--bg-muted)] text-[var(--text-muted)] line-through",
                // Blackout
                status === "blackout" && "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30",
                // Selected override
                isSelected && "ring-2 ring-[var(--color-brand-500)] ring-offset-1"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Status Legend */}
      <div className="mt-4 pt-4 border-t border-[var(--border-default)] flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-[var(--color-success)]" />
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded border border-dashed border-[var(--color-warning)]" />
          <span>Tentative</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-[var(--bg-muted)]" />
          <span>Maintenance</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30" />
          <span>Blackout</span>
        </div>
      </div>
    </div>
  );
}
