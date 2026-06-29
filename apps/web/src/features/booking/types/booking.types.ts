import type { BookingEntity } from "../domain/entities/booking.entity";
import type { BookingStatusValue } from "../domain/value-objects/booking-status.vo";

/**
 * Booking-related TypeScript types.
 * Separate from Zod schemas (which live in schemas/).
 */

/** Flattened, serialisable booking for list displays */
export interface BookingListItem {
  id: string;
  venueName: string;
  venueSlug: string;
  eventDate: string;
  status: BookingStatusValue;
  totalAmount: number | null;
  guestCount: number;
}

/** For the venue owner calendar */
export interface CalendarBooking {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: BookingStatusValue;
  customerName: string;
}

/** Helper: hydrate a CalendarBooking from a BookingEntity + extra data */
export function toCalendarBooking(
  booking: BookingEntity,
  customerName: string,
  venueName: string
): CalendarBooking {
  const dateStr = booking.eventDate.toISOString().split("T")[0];
  return {
    id: booking.id,
    title: `${customerName} @ ${venueName}`,
    start: new Date(`${dateStr}T00:00:00`),
    end:   new Date(`${dateStr}T23:59:59`),
    status: booking.status as BookingStatusValue,
    customerName,
  };
}
