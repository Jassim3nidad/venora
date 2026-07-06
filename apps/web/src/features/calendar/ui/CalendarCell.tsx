"use client";

import { useDroppable } from "@dnd-kit/core";
import { Booking, VenueAvailability } from "../hooks/use-calendar";
import { BookingDraggable } from "./BookingDraggable";
import { format, isToday, isSameMonth } from "date-fns";

interface CalendarCellProps {
  day: Date;
  currentMonth: Date;
  bookings: Booking[];
  availability: VenueAvailability | undefined;
  onClick: () => void;
}

export function CalendarCell({ day, currentMonth, bookings, availability, onClick }: CalendarCellProps) {
  const dateStr = format(day, "yyyy-MM-dd");
  const { isOver, setNodeRef } = useDroppable({
    id: dateStr,
    data: { date: dateStr },
  });

  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isTodayDate = isToday(day);

  // Styling based on availability status
  let bgClass = isCurrentMonth ? "bg-white" : "bg-gray-50";
  let opacityClass = isCurrentMonth ? "opacity-100" : "opacity-40";
  let borderClass = isOver ? "border-2 border-blue-500" : "border border-gray-100";

  if (availability?.status === "maintenance") {
    bgClass = "bg-orange-50";
    borderClass = isOver ? "border-2 border-blue-500" : "border-orange-200 border-dashed border-2";
  } else if (availability?.status === "blackout") {
    bgClass = "bg-gray-200";
    borderClass = isOver ? "border-2 border-blue-500" : "border-gray-300 border-dashed border-2";
  }

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`min-h-[120px] p-2 rounded-lg cursor-pointer transition-colors flex flex-col overflow-hidden relative ${bgClass} ${opacityClass} ${borderClass} hover:border-blue-300`}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
            isTodayDate ? "bg-blue-600 text-white" : isCurrentMonth ? "text-gray-700" : "text-gray-400"
          }`}
        >
          {format(day, "d")}
        </span>

        {/* Badges for maintenance/blackout */}
        {availability?.status === "maintenance" && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-1.5 rounded">Maintenance</span>
        )}
        {availability?.status === "blackout" && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 bg-gray-300 px-1.5 rounded">Blackout</span>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        {bookings.map((booking) => (
          <BookingDraggable key={booking.id} booking={booking} />
        ))}
      </div>
      
      {/* Seasonal Price Override Indicator */}
      {availability?.seasonal_price_override && (
        <div className="absolute bottom-1 right-2 text-[10px] font-semibold text-green-600">
          ₱{availability.seasonal_price_override.toLocaleString()}
        </div>
      )}
    </div>
  );
}
