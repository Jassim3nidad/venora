import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Maya (PayMaya) webhook handler.
 * Receives payment result events and updates booking status.
 *
 * Docs: https://developers.maya.ph/docs/webhooks
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-maya-signature");

  if (!verifyMayaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    id: string;
    status: string;
    metadata?: { booking_id?: string };
    requestReferenceNumber?: string;
  };

  const bookingId = payload.metadata?.booking_id;
  if (!bookingId) return NextResponse.json({ received: true });

  try {
    switch (payload.status) {
      case "PAYMENT_SUCCESS":
        await confirmBookingPayment(
          bookingId,
          payload.requestReferenceNumber ?? payload.id,
        );
        break;
      case "PAYMENT_FAILED":
      case "PAYMENT_EXPIRED":
      case "PAYMENT_CANCELLED":
        await failBookingPayment(
          bookingId,
          payload.requestReferenceNumber ?? payload.id,
          payload.status,
        );
        break;
      default:
        console.log(`[Maya] Unhandled status: ${payload.status}`);
    }
  } catch (error) {
    console.error("[Maya] Webhook processing failed:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function verifyMayaSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.MAYA_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha512", process.env.MAYA_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function confirmBookingPayment(
  bookingId: string,
  _providerReference: string,
): Promise<void> {
  // NOT WIRED UP: `confirm_booking_payment`'s signature was hardened in
  // migrations/046_payment_confirmation_reconciliation.sql to reconcile
  // against a checkout session this app itself created (p_checkout_reference,
  // p_payment_reference, p_amount_minor, p_currency) instead of trusting a
  // webhook-supplied booking_id directly — the old 4-arg (uuid, provider,
  // reference, amount) form this function used to call no longer exists in
  // the database. Maya has no registered PaymentGateway (see
  // register-gateways.ts) and no checkout session is ever created through
  // it, so this call is currently unreachable via real traffic (and
  // MAYA_WEBHOOK_SECRET is unset in prod, so verifyMayaSignature() already
  // rejects every request before this point). Before enabling Maya, rebuild
  // this to mirror process-webhook-event.usecase.ts's PayMongo flow: claim
  // the event via claim_payment_webhook_event for idempotency, then call the
  // current 5-arg confirm_booking_payment with a real checkout-session
  // reference, amount (minor units), and currency parsed from Maya's actual
  // webhook payload.
  throw new Error(
    `Maya payment confirmation is not implemented against the current confirm_booking_payment schema (booking ${bookingId})`,
  );
}

async function failBookingPayment(
  bookingId: string,
  providerReference: string,
  reason: string,
): Promise<void> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await supabase.rpc("fail_booking_payment", {
    p_booking_id: bookingId,
    p_payment_provider: "maya",
    p_provider_reference: providerReference,
    p_failure_reason: reason,
  });
  if (error) throw error;
}
