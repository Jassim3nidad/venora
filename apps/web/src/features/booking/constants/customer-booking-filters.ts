import type { BookingStatusValue } from "../domain/value-objects/booking-status.vo";

export type CustomerBookingStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "declined"
  | "cancelled"
  | "completed";

export const CUSTOMER_BOOKING_STATUS_FILTERS: Array<{
  value: CustomerBookingStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All bookings" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

const FILTER_VALUES = new Set<string>(
  CUSTOMER_BOOKING_STATUS_FILTERS.map((item) => item.value),
);

export function parseCustomerBookingStatusFilter(
  value?: string | null,
): CustomerBookingStatusFilter {
  if (value && FILTER_VALUES.has(value)) {
    return value as CustomerBookingStatusFilter;
  }

  return "all";
}

export function bookingMatchesStatusFilter(
  status: BookingStatusValue,
  filter: CustomerBookingStatusFilter,
) {
  if (filter === "all") return true;
  if (filter === "approved") {
    return status === "approved" || status === "payment_pending";
  }
  if (filter === "completed") {
    return status === "completed" || status === "reviewed";
  }

  return status === filter;
}

export function buildBookingsPageHref(
  filter: CustomerBookingStatusFilter,
  query?: { created?: string; cancelled?: string },
) {
  const params = new URLSearchParams();

  if (filter !== "all") {
    params.set("status", filter);
  }

  if (query?.created) {
    params.set("created", query.created);
  }

  if (query?.cancelled) {
    params.set("cancelled", query.cancelled);
  }

  const search = params.toString();
  return search ? `/bookings?${search}` : "/bookings";
}
