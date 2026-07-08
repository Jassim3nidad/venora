import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";

const statusActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    totalAmount: z.coerce.number().positive(),
    depositAmount: z.coerce.number().positive(),
    note: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal("decline"),
    reason: z.string().min(5).max(500),
  }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("complete"),
  }),
]);

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { data: null, error: { code, message, details } },
    { status },
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    const parsed = statusActionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid input. Please check the request body.",
        400,
        parsed.error.flatten(),
      );
    }

    const supabase = (await createClient()) as any;
    const input = parsed.data;
    let result;

    if (input.action === "approve") {
      result = await supabase
        .from("bookings")
        .update({
          status: "approved",
          total_amount: input.totalAmount,
          deposit_amount: input.depositAmount,
          approved_at: new Date().toISOString(),
          payment_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, status")
        .single();
    } else if (input.action === "decline") {
      result = await supabase
        .from("bookings")
        .update({
          status: "declined",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, status")
        .single();
    } else if (input.action === "cancel") {
      result = await supabase.rpc("cancel_booking_request", {
        p_booking_id: id,
        p_reason: input.reason?.trim() || null,
      });
    } else {
      result = await supabase.rpc("complete_booking_event", {
        p_booking_id: id,
      });
    }

    if (result.error) {
      return apiError("BOOKING_ACTION_FAILED", result.error.message, 400);
    }

    return NextResponse.json({
      data: {
        bookingId: result.data.id,
        status: result.data.status,
      },
      error: null,
    });
  } catch (error) {
    console.error("[api/bookings/status] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
