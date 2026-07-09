import { z } from "zod";

export const notificationKindSchema = z.enum([
  "booking_update",
  "payment_update",
  "review_request",
  "admin_alert",
  "supplier_inquiry",
  "system",
]);

export const notificationReadFilterSchema = z
  .enum(["all", "unread", "read"])
  .default("all");

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  read: notificationReadFilterSchema,
  kind: notificationKindSchema.optional(),
});

export const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean().optional().default(false),
  pushEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  bookingUpdates: z.boolean(),
  paymentUpdates: z.boolean(),
  reviewRequests: z.boolean(),
  adminAlerts: z.boolean(),
  quietHoursStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format.")
    .nullable(),
  quietHoursEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format.")
    .nullable(),
  timezone: z.string().trim().min(1).max(64).default("Asia/Manila"),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(16),
    auth: z.string().min(8),
  }),
  userAgent: z.string().max(500).optional(),
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;
