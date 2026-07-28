import { z } from "zod";

export const GUEST_RSVP_STATUSES = [
  "pending",
  "attending",
  "declined",
  "tentative",
] as const;

export const MAX_GUEST_IMPORT_ROWS = 500;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const guestInputSchema = z.object({
  id: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional().nullable(),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z
    .union([
      z.string().trim().email("Enter a valid email").max(320),
      z.literal(""),
    ])
    .optional()
    .nullable()
    .transform((value) => value || null),
  phone: optionalText(40),
  guestGroup: z.string().trim().min(1).max(100).default("General"),
  plusOnesAllowed: z.coerce.number().int().min(0).max(20).default(0),
  dietaryRequirements: optionalText(1000),
  accessibilityNotes: optionalText(1000),
  rsvpStatus: z.enum(GUEST_RSVP_STATUSES).default("pending"),
});

export const deleteGuestSchema = z.object({
  id: z.string().uuid(),
});

export const issueGuestRsvpSchema = z.object({
  id: z.string().uuid(),
  deadline: z.string().datetime().optional().nullable(),
});

export const revokeGuestRsvpSchema = z.object({
  id: z.string().uuid(),
});

export const publicGuestRsvpSchema = z.object({
  token: z.string().uuid(),
  status: z.enum(["attending", "declined", "tentative"]),
  plusOnes: z.coerce.number().int().min(0).max(20).default(0),
});

export const importGuestsSchema = z.object({
  guests: z
    .array(guestInputSchema.omit({ id: true }))
    .min(1, "CSV contains no guest records")
    .max(
      MAX_GUEST_IMPORT_ROWS,
      `Import is limited to ${MAX_GUEST_IMPORT_ROWS} guests at a time`,
    ),
});

export type GuestInput = z.infer<typeof guestInputSchema>;
export type GuestImportInput = z.infer<
  typeof importGuestsSchema
>["guests"][number];
