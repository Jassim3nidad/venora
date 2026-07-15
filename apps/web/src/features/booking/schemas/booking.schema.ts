import { z } from "zod";
import {
  isTodayOrFutureDateString,
  isValidDateOnlyString,
  PAST_DATE_MESSAGE,
} from "@/src/lib/date-only";
import {
  BOOKING_CANCELLATION_REASONS,
  type BookingCancellationReasonCode,
} from "../constants/cancellation-reasons";

/**
 * Booking schemas - Zod is the single source of truth at UI and server action
 * boundaries. Dates are date-only strings so event days do not shift by
 * timezone when they cross client/server boundaries.
 */

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .refine(isValidDateOnlyString, { message: "Choose a valid date" })
  .refine(isTodayOrFutureDateString, { message: PAST_DATE_MESSAGE });

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format")
  .optional()
  .or(z.literal(""));

export const createBookingSchema = z.object({
  venueId: z.string().uuid("Invalid venue ID"),
  packageId: z.string().uuid("Invalid package ID").optional().nullable(),
  eventDate: dateOnlySchema,
  eventStartTime: timeSchema,
  eventEndTime: timeSchema,
  guestCount: z.coerce.number().int().min(1, "Guest count must be at least 1"),
  specialRequests: z
    .string()
    .max(1000, "Keep requests under 1,000 characters")
    .optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const approveBookingSchema = z
  .object({
    bookingId: z.string().uuid(),
    totalAmount: z.coerce.number().positive("Enter a valid total amount"),
    depositAmount: z.coerce.number().positive("Enter a valid deposit amount"),
    note: z.string().max(1000).optional(),
  })
  .refine((input) => input.depositAmount <= input.totalAmount, {
    message: "Deposit cannot exceed the total amount",
    path: ["depositAmount"],
  });

export type ApproveBookingInput = z.infer<typeof approveBookingSchema>;

export const declineBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(5, "Add a short reason").max(500),
});

export type DeclineBookingInput = z.infer<typeof declineBookingSchema>;

export const cancelBookingSchema = z
  .object({
    bookingId: z.string().uuid(),
    reasonCode: z.enum(
      BOOKING_CANCELLATION_REASONS.map((item) => item.value) as [
        BookingCancellationReasonCode,
        ...BookingCancellationReasonCode[],
      ],
    ),
    reasonDetail: z.string().max(500).optional(),
  })
  .superRefine((input, ctx) => {
    if (
      input.reasonCode === "other" &&
      (!input.reasonDetail || input.reasonDetail.trim().length < 5)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please describe your reason (at least 5 characters).",
        path: ["reasonDetail"],
      });
    }
  });

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const startBookingPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  provider: z.enum(["paymongo", "maya", "stripe"]).default("paymongo"),
});

export type StartBookingPaymentInput = z.infer<
  typeof startBookingPaymentSchema
>;

export const completeBookingSchema = z.object({
  bookingId: z.string().uuid(),
});

export type CompleteBookingInput = z.infer<typeof completeBookingSchema>;

export const bookingReviewSchema = z.object({
  bookingId: z.string().uuid(),
  venueId: z.string().uuid(),
  overallRating: z.coerce.number().int().min(1).max(5),
  venueQuality: z.coerce.number().int().min(1).max(5).optional(),
  cleanliness: z.coerce.number().int().min(1).max(5).optional(),
  staffService: z.coerce.number().int().min(1).max(5).optional(),
  facilities: z.coerce.number().int().min(1).max(5).optional(),
  accessibility: z.coerce.number().int().min(1).max(5).optional(),
  valueForMoney: z.coerce.number().int().min(1).max(5).optional(),
  foodQuality: z.coerce.number().int().min(1).max(5).optional(),
  ambience: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export type BookingReviewInput = z.infer<typeof bookingReviewSchema>;

export const bookingFiltersSchema = z.object({
  status: z
    .enum([
      "pending",
      "approved",
      "payment_pending",
      "confirmed",
      "declined",
      "cancelled",
      "completed",
      "reviewed",
      "expired",
    ])
    .optional(),
  venueId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type BookingFilters = z.infer<typeof bookingFiltersSchema>;

export const sendBookingMessageSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must not exceed 2000 characters"),
});

export type SendBookingMessageInput = z.infer<typeof sendBookingMessageSchema>;
