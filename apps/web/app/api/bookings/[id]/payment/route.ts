import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";

const startPaymentSchema = z.object({
  provider: z.enum(["paymongo", "maya", "stripe"]).default("paymongo"),
});

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { data: null, error: { code, message, details } },
    { status },
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    const parsed = startPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid payment request.",
        400,
        parsed.error.flatten(),
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase.rpc("start_booking_payment", {
      p_booking_id: id,
      p_payment_provider: parsed.data.provider,
      p_checkout_url: `${appUrl}/bookings/${id}/confirmation`,
      p_provider_reference: null,
    });

    if (error) {
      return apiError("PAYMENT_START_FAILED", error.message, 400);
    }

    return NextResponse.json({
      data: {
        bookingId: id,
        transactionId: data.id,
        amount: data.amount,
        provider: data.payment_provider,
        checkoutUrl: data.checkout_url,
        status: data.status,
      },
      error: null,
    });
  } catch (error) {
    console.error("[api/bookings/payment] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
