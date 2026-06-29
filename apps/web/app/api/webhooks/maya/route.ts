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

  switch (payload.status) {
    case "PAYMENT_SUCCESS":
      await updateBookingStatus(bookingId, "confirmed");
      break;
    case "PAYMENT_FAILED":
    case "PAYMENT_EXPIRED":
    case "PAYMENT_CANCELLED":
      await updateBookingStatus(bookingId, "cancelled");
      break;
    default:
      console.log(`[Maya] Unhandled status: ${payload.status}`);
  }

  return NextResponse.json({ received: true });
}

function verifyMayaSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.MAYA_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha512", process.env.MAYA_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function updateBookingStatus(
  bookingId: string,
  status: "confirmed" | "cancelled"
): Promise<void> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await supabase.from("bookings").update({ status }).eq("id", bookingId);
}
