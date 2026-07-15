import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { data: null, error: { code, message } },
    { status },
  );
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);
    }

    const { error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: id,
    });

    if (error) {
      return apiError("NOTIFICATION_READ_FAILED", error.message, 400);
    }

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    console.error("[api/notifications/read] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
