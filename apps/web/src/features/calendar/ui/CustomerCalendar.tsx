"use client";

import { useState } from "react";
import { format, addMonths, subMonths, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCalendar } from "../hooks/use-calendar";
import { isPastDate } from "@/src/lib/date-only";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CustomerCalendarProps {
  venueId: string;
  basePrice: number;
}

export function CustomerCalendar({ venueId, basePrice }: CustomerCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { bookings, availability, isLoading, getBookingsForDay, getAvailabilityForDay } = useCalendar(venueId, currentMonth);

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 font-sans bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const dayAvailability = getAvailabilityForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const isPast = isPastDate(day);

            // Determine if unavailable
            // Unavailable if blackout, maintenance, or if there's an approved booking
            const isUnavailable = 
              isPast ||
              dayAvailability?.status === "blackout" || 
              dayAvailability?.status === "maintenance" ||
              dayAvailability?.status === "reserved" ||
              dayBookings.some(b => b.status === "approved" || b.status === "completed");

            const price = dayAvailability?.seasonal_price_override ?? basePrice;

            return (
              <div
                key={day.toString()}
                className={`
                  aspect-square p-1 rounded-lg flex flex-col justify-between items-center transition-colors
                  ${!isCurrentMonth ? "opacity-30 pointer-events-none" : ""}
                  ${isPast ? "bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed" : isUnavailable ? "bg-gray-50 opacity-50 line-through text-gray-400 cursor-not-allowed" : "bg-white border border-gray-100 hover:border-blue-500 cursor-pointer"}
                `}
              >
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mt-1 ${
                    isTodayDate && !isUnavailable ? "bg-blue-600 text-white" : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
                
                {!isUnavailable && isCurrentMonth && (
                  <span className="text-[9px] font-semibold text-green-600 mb-1">
                    ₱{(price / 1000).toFixed(1)}k
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
