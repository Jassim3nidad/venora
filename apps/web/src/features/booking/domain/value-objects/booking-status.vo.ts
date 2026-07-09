/**
 * BookingStatus Value Object
 *
 * Encapsulates booking status transitions and display logic.
 */

export const BOOKING_STATUSES = [
  "pending",
  "approved",
  "payment_pending",
  "confirmed",
  "declined",
  "cancelled",
  "completed",
  "reviewed",
  "expired",
] as const;

export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABEL: Record<BookingStatusValue, string> = {
  pending:         "Pending Approval",
  approved:        "Approved - Pay Deposit",
  payment_pending: "Payment Pending",
  confirmed:       "Confirmed",
  declined:        "Declined",
  cancelled:       "Cancelled",
  completed:       "Ready for Review",
  reviewed:        "Reviewed",
  expired:         "Expired",
};

export const BOOKING_STATUS_COLOR: Record<BookingStatusValue, string> = {
  pending:         "hsl(45 96% 42%)",
  approved:        "hsl(142 71% 35%)",
  payment_pending: "hsl(142 71% 35%)",
  confirmed:       "hsl(142 71% 35%)",
  declined:        "hsl(0 72% 42%)",
  cancelled:       "hsl(0 72% 42%)",
  completed:       "hsl(217 91% 48%)",
  reviewed:        "hsl(142 71% 35%)",
  expired:         "hsl(262 70% 42%)",
};

export const BOOKING_STATUS_BG: Record<BookingStatusValue, string> = {
  pending:         "hsl(45 96% 54% / 0.14)",
  approved:        "hsl(142 71% 45% / 0.14)",
  payment_pending: "hsl(142 71% 45% / 0.14)",
  confirmed:       "hsl(142 71% 45% / 0.14)",
  declined:        "hsl(0 72% 51% / 0.12)",
  cancelled:       "hsl(0 72% 51% / 0.12)",
  completed:       "hsl(217 91% 60% / 0.14)",
  reviewed:        "hsl(142 71% 45% / 0.14)",
  expired:         "hsl(262 70% 47% / 0.12)",
};

/** Valid transitions: status -> allowed next statuses */
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatusValue, BookingStatusValue[]> = {
  pending:         ["approved", "declined", "cancelled", "expired"],
  approved:        ["payment_pending", "cancelled", "expired"],
  payment_pending: ["confirmed", "approved", "cancelled", "expired"],
  confirmed:       ["completed", "cancelled"],
  declined:        [],
  cancelled:       [],
  completed:       ["reviewed"],
  reviewed:        [],
  expired:         [],
};

export const CANCELLABLE_BOOKING_STATUSES = [
  "pending",
  "approved",
  "payment_pending",
  "confirmed",
] as const satisfies readonly BookingStatusValue[];

export function canCancelBookingStatus(status: BookingStatusValue) {
  return (CANCELLABLE_BOOKING_STATUSES as readonly string[]).includes(status);
}

export function isValidTransition(
  from: BookingStatusValue,
  to: BookingStatusValue,
): boolean {
  return BOOKING_STATUS_TRANSITIONS[from].includes(to);
}
