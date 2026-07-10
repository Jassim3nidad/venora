import type { AvailabilityStatusValue } from "../types/calendar.types";

export const AVAILABILITY_STATUSES = [
  "available",
  "tentative",
  "reserved",
  "maintenance",
  "blackout",
] as const satisfies readonly AvailabilityStatusValue[];

export const BLOCKING_AVAILABILITY_STATUSES = [
  "tentative",
  "reserved",
  "maintenance",
  "blackout",
] as const satisfies readonly AvailabilityStatusValue[];

export const ACTIVE_BOOKING_STATUSES = [
  "pending",
  "approved",
  "payment_pending",
  "confirmed",
  "completed",
  "reviewed",
] as const;

export const AVAILABILITY_LABELS: Record<AvailabilityStatusValue, string> = {
  available: "Available",
  tentative: "Pending",
  reserved: "Booked",
  maintenance: "Maintenance",
  blackout: "Blocked",
};

export const AVAILABILITY_DESCRIPTIONS: Record<
  AvailabilityStatusValue,
  string
> = {
  available: "Customers can submit booking requests for this date.",
  tentative: "A pending or approved request is holding this date.",
  reserved: "This date is booked and cannot accept new requests.",
  maintenance: "The venue is unavailable because of maintenance work.",
  blackout: "The venue owner manually blocked this date.",
};

export const AVAILABILITY_BADGE_CLASSES: Record<
  AvailabilityStatusValue,
  string
> = {
  available: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  tentative: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  reserved: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  maintenance: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  blackout: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

export const AVAILABILITY_CELL_CLASSES: Record<
  AvailabilityStatusValue,
  string
> = {
  available: "border-emerald-100 bg-white",
  tentative: "border-amber-200 bg-amber-50",
  reserved: "border-blue-200 bg-blue-50",
  maintenance: "border-orange-200 bg-orange-50",
  blackout: "border-slate-300 bg-slate-100",
};

export function isBlockingAvailabilityStatus(status?: string | null) {
  return (BLOCKING_AVAILABILITY_STATUSES as readonly string[]).includes(
    status ?? "",
  );
}

export function isActiveBookingStatus(status?: string | null) {
  return (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status ?? "");
}
