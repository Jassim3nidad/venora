export type NotificationKind =
  | "booking_update"
  | "payment_update"
  | "review_request"
  | "admin_alert"
  | "supplier_inquiry"
  | "system";

export type NotificationChannel = "email" | "sms" | "push" | "in_app";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationReadFilter = "all" | "unread" | "read";

export type NotificationRecord = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  notifications: NotificationRecord[];
  unreadCount: number;
};

export type NotificationPreferences = {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  reviewRequests: boolean;
  adminAlerts: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
};

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  booking_update: "Booking updates",
  payment_update: "Payment updates",
  review_request: "Review requests",
  admin_alert: "Admin alerts",
  supplier_inquiry: "Supplier inquiries",
  system: "System",
};

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
