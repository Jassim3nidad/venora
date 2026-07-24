"use server";

import { createServiceClient } from "@/src/lib/supabase/service";

export type NotificationInsert = {
  user_id: string;
  title: string;
  body: string;
  link: string;
  kind?: string;
};

/**
 * Insert notifications for other users. Must use the service role —
 * authenticated clients cannot INSERT into `notifications` for anyone
 * but themselves (RLS + grants).
 */
export async function insertNotificationsForUsers(
  notifications: NotificationInsert[],
) {
  if (notifications.length === 0) return;

  const service = createServiceClient() as any;
  const { error } = await service.from("notifications").insert(
    notifications.map((notification) => ({
      user_id: notification.user_id,
      title: notification.title,
      body: notification.body.slice(0, 120),
      link: notification.link,
      kind: notification.kind ?? "booking_update",
    })),
  );

  if (error) {
    console.error("[notifications] insert failed:", error.message);
  }
}
