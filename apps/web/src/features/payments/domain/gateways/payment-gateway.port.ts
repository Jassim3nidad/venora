import type { PaymentProviderId } from "../../types/payment.types";

/**
 * PaymentGateway port — the provider abstraction boundary.
 *
 * Every payment provider (PayMongo today; Stripe later) implements
 * this interface. Application code (use-cases, API routes) depends only on
 * this contract and resolves concrete gateways through the registry, so a
 * new provider is added by:
 *
 *   1. implementing `PaymentGateway` under `infrastructure/<provider>/`
 *   2. registering it in `infrastructure/register-gateways.ts`
 *   3. adding its env keys
 *
 * No use-case, route, or UI change is required.
 */

export interface CreateCheckoutSessionParams {
  bookingId: string;
  transactionId: string;
  /** Amount in minor units (centavos). */
  amountMinor: number;
  currency: string;
  description: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
  /** Propagated to the provider so webhooks can correlate back to Venora. */
  metadata: Record<string, string>;
}

export interface CheckoutSession {
  provider: PaymentProviderId;
  /** Provider session reference (PayMongo `cs_...`). */
  sessionReference: string;
  /** Hosted payment page the customer is redirected to. */
  checkoutUrl: string;
}

export type RefundReason =
  "requested_by_customer" | "duplicate" | "fraudulent" | "others";

export interface CreateRefundParams {
  /** Provider payment reference to refund (PayMongo `pay_...`). */
  paymentReference: string;
  /** Amount in minor units (centavos). */
  amountMinor: number;
  reason: RefundReason;
  metadata?: Record<string, string>;
}

export interface RefundResult {
  provider: PaymentProviderId;
  /** Provider refund reference (PayMongo `ref_...`). */
  refundReference: string;
  status: "pending" | "succeeded" | "failed";
}

/**
 * Provider webhook payloads normalized to a small internal event union.
 * `ignored` carries events we intentionally do not act on.
 */
export type NormalizedWebhookEvent = {
  eventId: string;
  eventType: string;
} & (
  | {
      kind: "payment.succeeded";
      /**
       * The checkout session reference we ourselves generated and stored
       * on the transaction (via attach_payment_session). This — not
       * `bookingId` — is what confirm_booking_payment reconciles against;
       * a null value means the event cannot be safely correlated to a
       * transaction we created and must NOT be auto-confirmed.
       */
      checkoutSessionReference: string | null;
      /** Settled provider payment reference (PayMongo `pay_...`). */
      paymentReference: string;
      /** Captured amount in minor units (centavos). Required to reconcile. */
      amountMinor: number | null;
      /** Captured currency (e.g. "PHP"). Required to reconcile. */
      currency: string | null;
      /** Informational only — never trusted as the source of correlation. */
      bookingId: string | null;
      /** Internal transaction id copied from Venora-created provider metadata. */
      transactionId?: string | null;
    }
  | {
      kind: "payment.failed";
      bookingId: string | null;
      paymentReference: string;
      failureReason: string | null;
    }
  | {
      kind: "refund.succeeded";
      refundReference: string;
      amountMinor: number | null;
    }
  | {
      kind: "refund.failed";
      refundReference: string;
      failureReason: string | null;
    }
  | { kind: "ignored" }
);

export interface PaymentGateway {
  readonly id: PaymentProviderId;

  /** Create a hosted checkout session for a deposit payment. */
  createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CheckoutSession>;

  /** Issue a (full or partial) refund against a captured payment. */
  createRefund(params: CreateRefundParams): Promise<RefundResult>;

  /**
   * Verify the webhook signature against the raw request body.
   * Must be constant-time; returns false on any malformed input.
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
  ): boolean;

  /** Parse and normalize a (verified) webhook payload. */
  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent;
}
