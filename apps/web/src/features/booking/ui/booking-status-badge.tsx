import type { BookingStatusValue } from "../domain/value-objects/booking-status.vo";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_BG,
} from "../domain/value-objects/booking-status.vo";

interface BookingStatusBadgeProps {
  status: BookingStatusValue;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.875rem",
        borderRadius: "999px",
        background: BOOKING_STATUS_BG[status],
        color: BOOKING_STATUS_COLOR[status],
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}
