import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deletePushSubscriptionSchema,
  pushSubscriptionSchema,
} from "@/features/notifications/schemas/notification.schema";

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

async function getUser(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = pushSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid push subscription.",
        400,
        parsed.error.flatten(),
      );
    }

    const supabase = (await createClient()) as any;
    const user = await getUser(supabase);

    if (!user) {
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);
    }

    const input = parsed.data;
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          user_agent: input.userAgent ?? null,
          disabled_at: null,
        },
        { onConflict: "user_id,endpoint" },
      )
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      data: { subscriptionId: data.id },
      error: null,
    });
  } catch (error) {
    console.error("[api/push-subscriptions] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = deletePushSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid push subscription.",
        400,
        parsed.error.flatten(),
      );
    }

    const supabase = (await createClient()) as any;
    const user = await getUser(supabase);

    if (!user) {
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .update({ disabled_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("endpoint", parsed.data.endpoint);

    if (error) throw error;

    return NextResponse.json({ data: { disabled: true }, error: null });
  } catch (error) {
    console.error("[api/push-subscriptions] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
