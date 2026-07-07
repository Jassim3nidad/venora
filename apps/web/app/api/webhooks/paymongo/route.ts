import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * PayMongo webhook handler.
 * Receives payment events and updates booking status accordingly.
 *
 * Docs: https://developers.paymongo.com/docs/webhooks
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");

  // Verify webhook signature
  if (!verifyPaymongoSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    id?: string;
    data: {
      attributes: {
        type: string;
        data: {
          id?: string;
          attributes: {
            reference_number?: string;
            status: string;
            metadata?: { booking_id?: string };
          };
        };
      };
    };
  };

  const { type, data } = event.data.attributes;
  const bookingId = data.attributes.metadata?.booking_id;

  if (!bookingId) {
    return NextResponse.json({ received: true });
  }

  // Handle specific event types
  switch (type) {
    case "payment.paid":
      await confirmBookingPayment(
        bookingId,
        data.id ?? data.attributes.reference_number ?? event.id ?? bookingId,
      );
      break;
    case "payment.failed":
      await failBookingPayment(
        bookingId,
        data.id ?? data.attributes.reference_number ?? event.id ?? bookingId,
        data.attributes.status,
      );
      break;
    default:
      // Log and ignore unknown events
      console.log(`[PayMongo] Unhandled event: ${type}`);
  }

  return NextResponse.json({ received: true });
}

function verifyPaymongoSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.PAYMONGO_WEBHOOK_SECRET) return false;
  const [, timestampPart, signaturePart] = signature.split(",");
  const timestamp = timestampPart?.replace("t=", "") ?? "";
  const receivedSignature = signaturePart?.replace("te=", "") ?? "";
  const toSign = `${timestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET)
    .update(toSign)
    .digest("hex");
  if (expected.length !== receivedSignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSignature));
}

async function confirmBookingPayment(
  bookingId: string,
  providerReference: string,
): Promise<void> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await supabase.rpc("confirm_booking_payment", {
    p_booking_id: bookingId,
    p_payment_provider: "paymongo",
    p_provider_reference: providerReference,
    p_amount: null,
  });
  if (error) throw error;
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
    p_payment_provider: "paymongo",
    p_provider_reference: providerReference,
    p_failure_reason: reason,
  });
  if (error) throw error;
}
