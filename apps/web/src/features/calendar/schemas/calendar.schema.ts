import { z } from "zod";

export const availabilityStatusSchema = z.enum(["available", "reserved", "tentative", "maintenance", "blackout"]);

export const updateAvailabilitySchema = z.object({
  venueId: z.string().uuid("Invalid venue ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  status: availabilityStatusSchema,
  seasonalPriceOverride: z.number().positive("Price must be positive").nullable().optional(),
  note: z.string().max(500, "Note too long").nullable().optional(),
});

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export const moveBookingSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export type MoveBookingInput = z.infer<typeof moveBookingSchema>;
