import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notificationListQuerySchema } from "@/features/notifications/schemas/notification.schema";
import { mapNotification } from "@/features/notifications/application/mappers";

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

export async function GET(request: NextRequest) {
  try {
    const parsed = notificationListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid notification filters.",
        400,
        parsed.error.flatten(),
      );
    }

    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);
    }

    await supabase.rpc("ensure_notification_preferences", {
      p_user_id: user.id,
    });

    let query = supabase
      .from("notifications")
      .select(
        `
          id,
          user_id,
          channel,
          kind,
          title,
          body,
          link,
          metadata,
          priority,
          is_read,
          read_at,
          created_at
        `,
      )
      .eq("user_id", user.id)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(parsed.data.limit);

    if (parsed.data.read === "read") {
      query = query.eq("is_read", true);
    } else if (parsed.data.read === "unread") {
      query = query.eq("is_read", false);
    }

    if (parsed.data.kind) {
      query = query.eq("kind", parsed.data.kind);
    }

    const [{ data, error }, unreadResult] = await Promise.all([
      query,
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
    ]);

    if (error) throw error;
    if (unreadResult.error) throw unreadResult.error;

    return NextResponse.json({
      data: {
        notifications: (data ?? []).map(mapNotification),
        unreadCount: unreadResult.count ?? 0,
      },
      error: null,
    });
  } catch (error) {
    console.error("[api/notifications] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
