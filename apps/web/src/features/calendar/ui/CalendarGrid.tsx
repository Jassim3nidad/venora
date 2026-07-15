"use client";

import {
  DndContext,
  DragEndEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";
import { useCalendar, Booking } from "../hooks/use-calendar";
import { CalendarCell } from "./CalendarCell";
import { moveBookingDate } from "../application/calendar-actions";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner"; // Assuming sonner is used for toasts, standard in shadcn
import { isPastDate } from "@/src/lib/date-only";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarGridProps {
  venueId: string;
  currentMonth: Date;
  onDayClick: (day: Date) => void;
  disablePastDates?: boolean;
}

export function CalendarGrid({
  venueId,
  currentMonth,
  onDayClick,
  disablePastDates = false,
}: CalendarGridProps) {
  const {
    bookings,
    availability,
    isLoading,
    getBookingsForDay,
    getAvailabilityForDay,
  } = useCalendar(venueId, currentMonth);
  const [isUpdating, setIsUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px drag distance to activate, allows clicking
    }),
  );

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const bookingId = active.id as string;
    const newDateStr = over.id as string;

    // Find booking
    const booking = active.data.current?.booking as Booking;
    if (!booking) return;

    // Check if dragging to same day
    const oldDateStr = booking.event_date;
    if (oldDateStr === newDateStr) return;

    setIsUpdating(true);
    const toastId = toast.loading("Moving booking...");

    try {
      const result = await moveBookingDate({
        bookingId,
        newDate: newDateStr,
      });

      if (result.success) {
        toast.success("Booking moved successfully", { id: toastId });
      } else {
        toast.error(result.error || "Failed to move booking", { id: toastId });
      }
    } catch (err) {
      toast.error("An unexpected error occurred", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading calendar data...</p>
      </div>
    );
  }

  return (
    <div
      className={`relative ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="text-center py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
          >
            {d}
          </div>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const dayAvailability = getAvailabilityForDay(day);
            const isDisabled = disablePastDates && isPastDate(day);

            return (
              <CalendarCell
                key={day.toString()}
                day={day}
                currentMonth={currentMonth}
                bookings={dayBookings}
                availability={dayAvailability}
                isDisabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  onDayClick(day);
                }}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
