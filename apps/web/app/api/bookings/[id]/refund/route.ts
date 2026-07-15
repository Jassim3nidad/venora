import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { VenoraError } from "@/src/lib/errors";
import "@/src/features/payments/infrastructure/register-gateways";
import { refundRequestSchema } from "@/src/features/payments/schemas/payment.schema";
import { requestRefund } from "@/src/features/payments/application/use-cases/request-refund.usecase";

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

/**
 * POST /api/bookings/:id/refund
 * Requests a refund of the paid deposit for a cancelled booking.
 * Permission (customer / venue org member / admin) and state validation
 * happen in the `request_booking_refund` RPC.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, body] = await Promise.all([
      context.params,
      request.json().catch(() => ({})),
    ]);
    const parsed = refundRequestSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid refund request.",
        400,
        parsed.error.flatten(),
      );
    }

    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError(
        "UNAUTHORIZED",
        "You must be signed in to request a refund.",
        401,
      );
    }

    const result = await requestRefund(supabase, createServiceClient(), {
      bookingId: id,
      reason: parsed.data.reason ?? null,
    });

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof VenoraError) {
      return apiError(error.code, error.message, error.httpStatus);
    }
    console.error("[api/bookings/refund] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
