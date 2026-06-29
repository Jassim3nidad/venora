import { z } from "zod";

/**
 * Booking schemas — Zod as single source of truth.
 * Consumed by both the client form (react-hook-form) and server boundary validation.
 *
 * @see Section 7 of Architecture Foundation
 */

export const createBookingSchema = z.object({
  venueId: z.string().uuid("Invalid venue ID"),
  packageId: z.string().uuid("Invalid package ID").optional(),
  eventDate: z.coerce.date().refine((d) => d >= new Date(new Date().toDateString()), {
    message: "Event date must be in the future",
  }),
  guestCount: z.number().int().min(1, "Guest count must be at least 1"),
  specialRequests: z.string().max(1000).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ── Filters for listing ───────────────────────────────────────────────────────

export const bookingFiltersSchema = z.object({
  status:   z.enum(["pending", "approved", "declined", "cancelled", "completed", "expired"]).optional(),
  venueId:  z.string().uuid().optional(),
  from:     z.string().optional(),
  to:       z.string().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type BookingFilters = z.infer<typeof bookingFiltersSchema>;
