import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notificationPreferencesSchema } from "@/features/notifications/schemas/notification.schema";
import { mapNotificationPreferences } from "@/features/notifications/application/mappers";

function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { data: null, error: { code, message, details } },
    { status },
  );
}

async function requireUser(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function GET() {
  try {
    const supabase = (await createClient()) as any;
    const user = await requireUser(supabase);

    if (!user) {
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);
    }

    const { data, error } = await supabase.rpc(
      "ensure_notification_preferences",
      { p_user_id: user.id },
    );

    if (error) throw error;

    return NextResponse.json({
      data: mapNotificationPreferences(data),
      error: null,
    });
  } catch (error) {
    console.error("[api/notification-preferences] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = notificationPreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid notification preferences.",
        400,
        parsed.error.flatten(),
      );
    }

    const supabase = (await createClient()) as any;
    const user = await requireUser(supabase);

    if (!user) {
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);
    }

    const input = parsed.data;
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: user.id,
        email_enabled: input.emailEnabled,
        sms_enabled: false,
        push_enabled: input.pushEnabled,
        in_app_enabled: input.inAppEnabled,
        booking_updates: input.bookingUpdates,
        payment_updates: input.paymentUpdates,
        review_requests: input.reviewRequests,
        admin_alerts: input.adminAlerts,
        quiet_hours_start: input.quietHoursStart,
        quiet_hours_end: input.quietHoursEnd,
        timezone: input.timezone,
      })
      .select(
        `
          user_id,
          email_enabled,
          sms_enabled,
          push_enabled,
          in_app_enabled,
          booking_updates,
          payment_updates,
          review_requests,
          admin_alerts,
          quiet_hours_start,
          quiet_hours_end,
          timezone
        `,
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      data: mapNotificationPreferences(data),
      error: null,
    });
  } catch (error) {
    console.error("[api/notification-preferences] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
