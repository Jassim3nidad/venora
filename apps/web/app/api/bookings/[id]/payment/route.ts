import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { VenoraError } from "@/src/lib/errors";
import "@/src/features/payments/infrastructure/register-gateways";
import { startPaymentSchema } from "@/src/features/payments/schemas/payment.schema";
import { startCheckout } from "@/src/features/payments/application/use-cases/start-checkout.usecase";

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
 * POST /api/bookings/:id/payment
 * Starts (or resumes) the deposit checkout and returns the hosted
 * provider checkout URL. Auth + booking ownership are enforced by the
 * `start_booking_payment` RPC under RLS.
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
    const parsed = startPaymentSchema.safeParse(body ?? {});

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
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "You must be signed in to pay.", 401);
    }

    const result = await startCheckout(supabase, createServiceClient(), {
      bookingId: id,
      provider: parsed.data.provider,
      appUrl,
      customerEmail: user.email ?? null,
    });

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof VenoraError) {
      return apiError(error.code, error.message, error.httpStatus);
    }
    console.error("[api/bookings/payment] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
