import type {
  NotificationPreferences,
  NotificationRecord,
} from "../types/notification.types";

type NotificationRow = {
  id: string;
  user_id: string;
  channel: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type PreferencesRow = {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  booking_updates: boolean;
  payment_updates: boolean;
  review_requests: boolean;
  admin_alerts: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
};

export function mapNotification(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel as NotificationRecord["channel"],
    kind: row.kind as NotificationRecord["kind"],
    title: row.title,
    body: row.body,
    link: row.link,
    metadata: row.metadata ?? {},
    priority: row.priority as NotificationRecord["priority"],
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function mapNotificationPreferences(
  row: PreferencesRow,
): NotificationPreferences {
  return {
    userId: row.user_id,
    emailEnabled: row.email_enabled,
    smsEnabled: row.sms_enabled,
    pushEnabled: row.push_enabled,
    inAppEnabled: row.in_app_enabled,
    bookingUpdates: row.booking_updates,
    paymentUpdates: row.payment_updates,
    reviewRequests: row.review_requests,
    adminAlerts: row.admin_alerts,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    timezone: row.timezone,
  };
}
