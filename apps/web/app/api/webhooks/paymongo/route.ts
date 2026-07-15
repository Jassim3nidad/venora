import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import "@/src/features/payments/infrastructure/register-gateways";
import { getGateway } from "@/src/features/payments/application/gateway-registry";
import { processWebhookEvent } from "@/src/features/payments/application/use-cases/process-webhook-event.usecase";

/**
 * POST /api/webhooks/paymongo
 *
 * PayMongo webhook receiver. Signature-verified, idempotent (each event
 * is claimed exactly once in payment_webhook_events), and processed via
 * service-role RPCs. Handles payment success/failure and the refund
 * lifecycle.
 *
 * Returning 5xx makes PayMongo retry; failed events are re-claimable.
 * Docs: https://developers.paymongo.com/docs/webhooks
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");

  let gateway;
  try {
    gateway = getGateway("paymongo");
  } catch {
    console.error("[webhooks/paymongo] Gateway not configured");
    return NextResponse.json(
      { error: "Provider not configured" },
      { status: 503 },
    );
  }

  const serviceClient = createServiceClient();
  const outcome = await processWebhookEvent(
    serviceClient,
    gateway,
    rawBody,
    signature,
  );

  if (!outcome.ok) {
    if (outcome.result === "invalid_signature") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.error("[webhooks/paymongo] Processing failed:", outcome.error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, result: outcome.result });
}
