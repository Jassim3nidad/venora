import type { SupabaseClient } from "@supabase/supabase-js";
import { fromMinorUnits } from "../../domain/value-objects/money.vo";
import type {
  NormalizedWebhookEvent,
  PaymentGateway,
} from "../../domain/gateways/payment-gateway.port";
import type { TransactionRow } from "../../types/payment.types";

export type WebhookProcessOutcome =
  | { ok: true; result: "processed" | "duplicate" | "skipped" }
  | { ok: false; result: "invalid_signature" | "failed"; error?: string };

/**
 * Verifies, claims (idempotency), and dispatches one provider webhook.
 *
 * Uses the service-role client: webhooks have no user session, and the
 * dispatch RPCs are service_role-only by design.
 */
export async function processWebhookEvent(
  serviceClient: SupabaseClient,
  gateway: PaymentGateway,
  rawBody: string,
  signatureHeader: string | null,
): Promise<WebhookProcessOutcome> {
  if (!gateway.verifyWebhookSignature(rawBody, signatureHeader)) {
    return { ok: false, result: "invalid_signature" };
  }

  let event: NormalizedWebhookEvent;
  try {
    event = gateway.parseWebhookEvent(rawBody);
  } catch (error) {
    return {
      ok: false,
      result: "failed",
      error: error instanceof Error ? error.message : "Unparseable webhook payload",
    };
  }

  const { data: claimed, error: claimError } = await serviceClient.rpc(
    "claim_payment_webhook_event",
    {
      p_provider: gateway.id,
      p_event_id: event.eventId,
      p_event_type: event.eventType,
      p_payload: JSON.parse(rawBody),
    },
  );

  if (claimError) {
    return { ok: false, result: "failed", error: claimError.message };
  }

  if (!claimed) {
    return { ok: true, result: "duplicate" };
  }

  const finish = (status: "processed" | "failed" | "skipped", error?: string) =>
    serviceClient.rpc("finish_payment_webhook_event", {
      p_provider: gateway.id,
      p_event_id: event.eventId,
      p_status: status,
      p_error: error ?? null,
    });

  try {
    switch (event.kind) {
      case "payment.succeeded": {
        const paymentContext = await resolvePaymentContext(serviceClient, event);

        if (paymentContext.alreadySettled) {
          await finish("skipped", "Payment already settled");
          return { ok: true, result: "skipped" };
        }
        // Direct payment.paid events do not carry the checkout-session id,
        // but PayMongo copies our Venora-created transaction metadata onto
        // the payment. Use it only after loading the transaction and
        // rechecking amount, currency, booking, status, and stored session.
        if (!paymentContext.checkoutSessionReference) {
          console.error(
            `[payments] Unreconcilable payment.succeeded event ${event.eventId}: ` +
              `no checkout session reference for payment ${event.paymentReference}. ` +
              "Requires manual reconciliation.",
          );
          await finish("skipped", "No checkout session reference; requires manual reconciliation");
          return { ok: true, result: "skipped" };
        }

        if (event.amountMinor === null || event.currency === null) {
          throw new Error(
            `Reconciliation failed: missing amount/currency on checkout session ${paymentContext.checkoutSessionReference}`,
          );
        }

        const { error } = await serviceClient.rpc("confirm_booking_payment", {
          p_payment_provider: gateway.id,
          p_checkout_reference: paymentContext.checkoutSessionReference,
          p_payment_reference: event.paymentReference,
          p_amount_minor: event.amountMinor,
          p_currency: event.currency,
        });
        if (error) throw new Error(error.message);
        break;
      }

      case "payment.failed": {
        const bookingId =
          event.bookingId ??
          (await lookupBookingByReference(serviceClient, event.paymentReference));
        if (!bookingId) {
          throw new Error(`No booking found for payment ${event.paymentReference}`);
        }
        const { error } = await serviceClient.rpc("fail_booking_payment", {
          p_booking_id: bookingId,
          p_payment_provider: gateway.id,
          p_provider_reference: event.paymentReference,
          p_failure_reason: event.failureReason,
        });
        if (error) throw new Error(error.message);
        break;
      }

      case "refund.succeeded": {
        const { error } = await serviceClient.rpc("complete_booking_refund", {
          p_payment_provider: gateway.id,
          p_provider_reference: event.refundReference,
          p_amount: event.amountMinor !== null ? fromMinorUnits(event.amountMinor) : null,
        });
        if (error) throw new Error(error.message);
        break;
      }

      case "refund.failed": {
        const { error } = await serviceClient.rpc("fail_booking_refund", {
          p_payment_provider: gateway.id,
          p_provider_reference: event.refundReference,
          p_failure_reason: event.failureReason,
        });
        if (error) throw new Error(error.message);
        break;
      }

      case "ignored":
        await finish("skipped");
        return { ok: true, result: "skipped" };
    }

    await finish("processed");
    return { ok: true, result: "processed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await finish("failed", message);
    return { ok: false, result: "failed", error: message };
  }
}

/**
 * Fallback correlation when the provider event carries no booking metadata:
 * match the checkout-session or payment reference stored on the transaction.
 */
async function lookupBookingByReference(
  serviceClient: SupabaseClient,
  providerReference: string,
): Promise<string | null> {
  const { data } = await serviceClient
    .from("transactions")
    .select("booking_id")
    .eq("provider_reference", providerReference)
    .limit(1)
    .maybeSingle<{ booking_id: string }>();

  return data?.booking_id ?? null;
}

type PaymentContext = {
  checkoutSessionReference: string | null;
  alreadySettled: boolean;
};

async function resolvePaymentContext(
  serviceClient: SupabaseClient,
  event: Extract<NormalizedWebhookEvent, { kind: "payment.succeeded" }>,
): Promise<PaymentContext> {
  const transaction = event.transactionId
    ? await lookupTransactionById(serviceClient, event.transactionId)
    : null;

  if (transaction?.status === "paid") {
    return { checkoutSessionReference: null, alreadySettled: true };
  }

  if (event.checkoutSessionReference) {
    return {
      checkoutSessionReference: event.checkoutSessionReference,
      alreadySettled: false,
    };
  }

  if (!transaction) {
    return { checkoutSessionReference: null, alreadySettled: false };
  }

  const expectedAmountMinor = Math.round(Number(transaction.amount) * 100);
  const amountMatches = event.amountMinor !== null && expectedAmountMinor === event.amountMinor;
  const currencyMatches =
    event.currency !== null &&
    String(transaction.currency).toUpperCase() === String(event.currency).toUpperCase();
  const bookingMatches = !event.bookingId || transaction.booking_id === event.bookingId;

  if (
    transaction.status !== "pending" ||
    transaction.payment_kind !== "deposit" ||
    !transaction.provider_reference ||
    !amountMatches ||
    !currencyMatches ||
    !bookingMatches
  ) {
    return { checkoutSessionReference: null, alreadySettled: false };
  }

  return {
    checkoutSessionReference: transaction.provider_reference,
    alreadySettled: false,
  };
}

async function lookupTransactionById(
  serviceClient: SupabaseClient,
  transactionId: string,
): Promise<
  | Pick<
      TransactionRow,
      "id" | "booking_id" | "provider_reference" | "amount" | "currency" | "status" | "payment_kind"
    >
  | null
> {
  const { data } = await serviceClient
    .from("transactions")
    .select("id, booking_id, provider_reference, amount, currency, status, payment_kind")
    .eq("id", transactionId)
    .maybeSingle<
      Pick<
        TransactionRow,
        "id" | "booking_id" | "provider_reference" | "amount" | "currency" | "status" | "payment_kind"
      >
    >();

  return data ?? null;
}
