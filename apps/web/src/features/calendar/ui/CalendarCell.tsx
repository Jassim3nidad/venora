"use client";

import { useDroppable } from "@dnd-kit/core";
import { format, isSameMonth, isToday } from "date-fns";
import { Booking, VenueAvailability } from "../hooks/use-calendar";
import {
  AVAILABILITY_BADGE_CLASSES,
  AVAILABILITY_CELL_CLASSES,
  AVAILABILITY_LABELS,
  isActiveBookingStatus,
} from "../utils/availability";
import { BookingDraggable } from "./BookingDraggable";

interface CalendarCellProps {
  day: Date;
  currentMonth: Date;
  bookings: Booking[];
  availability: VenueAvailability | undefined;
  onClick: () => void;
  isDisabled?: boolean;
}

export function CalendarCell({
  day,
  currentMonth,
  bookings,
  availability,
  onClick,
  isDisabled = false,
}: CalendarCellProps) {
  const dateStr = format(day, "yyyy-MM-dd");
  const { isOver, setNodeRef } = useDroppable({
    id: dateStr,
    disabled: isDisabled,
    data: { date: dateStr, disabled: isDisabled },
  });

  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isTodayDate = isToday(day);
  const activeBooking = bookings.find((booking) =>
    isActiveBookingStatus(booking.status),
  );
  const effectiveStatus =
    availability?.status ??
    (activeBooking?.status === "pending" || activeBooking?.status === "approved"
      ? "tentative"
      : activeBooking
        ? "reserved"
        : "available");

  let bgClass = isCurrentMonth
    ? AVAILABILITY_CELL_CLASSES[effectiveStatus]
    : "border-gray-100 bg-gray-50";
  let opacityClass = isCurrentMonth ? "opacity-100" : "opacity-40";
  let borderClass = isOver ? "border-2 border-blue-500" : "border";

  if (isDisabled) {
    bgClass = "bg-gray-50";
    opacityClass = "opacity-50";
    borderClass = "border border-gray-200";
  }

  return (
    <div
      ref={setNodeRef}
      onClick={isDisabled ? undefined : onClick}
      aria-disabled={isDisabled}
      className={`relative flex min-h-[120px] flex-col overflow-hidden rounded-2xl p-2 transition-colors ${bgClass} ${opacityClass} ${borderClass} ${
        isDisabled
          ? "cursor-not-allowed text-gray-400"
          : "cursor-pointer hover:border-blue-300"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            isDisabled
              ? "text-gray-400"
              : isTodayDate
                ? "bg-blue-600 text-white"
                : isCurrentMonth
                  ? "text-gray-700"
                  : "text-gray-400"
          }`}
        >
          {format(day, "d")}
        </span>

        {effectiveStatus !== "available" ? (
          <span
            className={`truncate rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${AVAILABILITY_BADGE_CLASSES[effectiveStatus]}`}
          >
            {AVAILABILITY_LABELS[effectiveStatus]}
          </span>
        ) : null}
      </div>

      <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto">
        {bookings.map((booking) => (
          <BookingDraggable key={booking.id} booking={booking} />
        ))}
      </div>

      {!isDisabled && availability?.seasonal_price_override ? (
        <div className="absolute bottom-1 right-2 text-[10px] font-semibold text-green-600">
          ₱{availability.seasonal_price_override.toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}
