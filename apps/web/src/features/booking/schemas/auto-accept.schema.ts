import { z } from "zod";

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().positive().optional(),
);

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const optionalTime = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
);

export const venueAutoAcceptSettingsSchema = z
  .object({
    enabled: z.boolean(),
    minimumNoticeHours: z.coerce.number().int().min(0).max(8760),
    maximumGuestCount: optionalPositiveInteger,
    allowedWeekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1),
    allowedStartTime: optionalTime,
    allowedEndTime: optionalTime,
    minimumDurationMinutes: optionalPositiveInteger,
    maximumDurationMinutes: optionalPositiveInteger,
    minimumBookingAmount: optionalPositiveNumber,
    requireStandardPackage: z.boolean(),
    requireDeposit: z.boolean(),
    requireVerifiedCustomer: z.boolean(),
    allowedEventTypeIds: z.array(z.string().uuid()).nullable(),
    confidenceThreshold: z.coerce.number().min(0).max(1),
    reviewWindowMinutes: z.coerce.number().int().min(0).max(10080),
  })
  .superRefine((input, context) => {
    if (
      input.allowedStartTime &&
      input.allowedEndTime &&
      input.allowedStartTime >= input.allowedEndTime
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be later than start time.",
        path: ["allowedEndTime"],
      });
    }
    if (
      input.minimumDurationMinutes &&
      input.maximumDurationMinutes &&
      input.minimumDurationMinutes > input.maximumDurationMinutes
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum duration must be at least the minimum.",
        path: ["maximumDurationMinutes"],
      });
    }
  });

export type VenueAutoAcceptSettingsInput = z.infer<
  typeof venueAutoAcceptSettingsSchema
>;
