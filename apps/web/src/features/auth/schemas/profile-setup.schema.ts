import { z } from "zod";

export const PROFILE_EVENT_TYPE_OPTIONS = [
  "Weddings",
  "Birthdays",
  "Corporate events",
  "Social gatherings",
] as const;

export const profilePreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  bookingReminders: z.boolean(),
  marketingEmails: z.boolean(),
  preferredEventTypes: z.array(z.string()).default([]),
});

export const profileSetupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+63|0)9\d{9}$/, "Enter a valid PH mobile number (e.g. 09171234567)")
    .optional()
    .or(z.literal("")),
  preferences: profilePreferencesSchema,
});

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
export type ProfilePreferencesInput = z.infer<typeof profilePreferencesSchema>;
