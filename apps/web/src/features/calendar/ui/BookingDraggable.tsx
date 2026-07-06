"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Booking } from "../hooks/use-calendar";
import { Users, Building2 } from "lucide-react";

interface BookingDraggableProps {
  booking: Booking;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  pending:   { bg: "#FFF3CD", color: "#B45309", dot: "#F59E0B" },
  approved:  { bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
  declined:  { bg: "#FEE2E2", color: "#991B1B", dot: "#EF4444" },
  cancelled: { bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" },
  completed: { bg: "#E0E7FF", color: "#3730A3", dot: "#6366F1" },
  expired:   { bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" },
};

export function BookingDraggable({ booking }: BookingDraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: booking.id,
    data: { booking },
  });

  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    background: cfg.bg,
    color: cfg.color,
    border: `1px solid ${cfg.dot}33`,
    cursor: "grab",
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-md p-1.5 mb-1 text-xs font-semibold flex flex-col gap-0.5 shadow-sm hover:shadow-md transition-shadow relative"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-hidden">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
          <span className="truncate">{booking.customer.full_name}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] opacity-80 truncate">
        <span className="flex items-center gap-0.5"><Building2 size={10} /> {booking.venue.name}</span>
        <span className="flex items-center gap-0.5"><Users size={10} /> {booking.guest_count}</span>
      </div>
    </div>
  );
}
