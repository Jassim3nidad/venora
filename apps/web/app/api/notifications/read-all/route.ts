import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { data: null, error: { code, message } },
    { status },
  );
}

export async function POST() {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);
    }

    const { data, error } = await supabase.rpc("mark_all_notifications_read");

    if (error) {
      return apiError("NOTIFICATIONS_READ_FAILED", error.message, 400);
    }

    return NextResponse.json({
      data: { markedCount: Number(data ?? 0) },
      error: null,
    });
  } catch (error) {
    console.error("[api/notifications/read-all] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
