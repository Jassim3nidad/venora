/**
 * BookingStatus Value Object
 *
 * Encapsulates booking status transitions and display logic.
 */

export const BOOKING_STATUSES = [
  "pending",
  "approved",
  "declined",
  "cancelled",
  "completed",
  "expired",
] as const;

export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABEL: Record<BookingStatusValue, string> = {
  pending:   "Pending Approval",
  approved:  "Approved",
  declined:  "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
  expired:   "Expired",
};

export const BOOKING_STATUS_COLOR: Record<BookingStatusValue, string> = {
  pending:   "hsl(45 96% 54%)",
  approved:  "hsl(142 71% 45%)",
  declined:  "hsl(0 72% 51%)",
  cancelled: "hsl(0 72% 51%)",
  completed: "hsl(217 91% 60%)",
  expired:   "hsl(262 70% 47%)",
};

export const BOOKING_STATUS_BG: Record<BookingStatusValue, string> = {
  pending:   "hsl(45 96% 54% / 0.12)",
  approved:  "hsl(142 71% 45% / 0.12)",
  declined:  "hsl(0 72% 51% / 0.12)",
  cancelled: "hsl(0 72% 51% / 0.12)",
  completed: "hsl(217 91% 60% / 0.12)",
  expired:   "hsl(262 70% 47% / 0.12)",
};

/** Valid transitions: status → allowed next statuses */
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatusValue, BookingStatusValue[]> = {
  pending:   ["approved", "declined", "cancelled", "expired"],
  approved:  ["completed", "cancelled"],
  declined:  [],
  cancelled: [],
  completed: [],
  expired:   [],
};

export function isValidTransition(
  from: BookingStatusValue,
  to: BookingStatusValue
): boolean {
  return BOOKING_STATUS_TRANSITIONS[from].includes(to);
}
