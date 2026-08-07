import crypto from "crypto";
import { PaymentError } from "@/lib/errors";
import type {
  CheckoutSession,
  CreateCheckoutSessionParams,
  CreateRefundParams,
  NormalizedWebhookEvent,
  PaymentGateway,
  RefundResult,
} from "../../domain/gateways/payment-gateway.port";

const PAYMONGO_API_URL = "https://api.paymongo.com/v1";
const REQUEST_TIMEOUT_MS = 15_000;

/** Payment methods surfaced on the hosted checkout page. */
const PAYMENT_METHOD_TYPES = ["card", "gcash", "grab_pay"];

/** PayMongo only settles in Philippine pesos today. */
const SUPPORTED_CURRENCIES = ["PHP"];

interface PayMongoConfig {
  secretKey: string;
  webhookSecret: string;
}

interface PayMongoResource<A> {
  id: string;
  type: string;
  attributes: A;
}

interface PayMongoErrorBody {
  errors?: Array<{ code?: string; detail?: string }>;
}

function metadataValue(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function lineItemAmountMinor(
  lineItems: Array<{ amount?: number; quantity?: number }> | undefined,
): number | null {
  if (!lineItems || lineItems.length === 0) return null;

  const total = lineItems.reduce((sum, item) => {
    if (typeof item.amount !== "number") return sum;
    return (
      sum +
      item.amount * (typeof item.quantity === "number" ? item.quantity : 1)
    );
  }, 0);

  return total > 0 ? total : null;
}

function lineItemCurrency(
  lineItems: Array<{ currency?: string }> | undefined,
): string | null {
  const currency = lineItems?.find(
    (item) => typeof item.currency === "string",
  )?.currency;
  return currency ?? null;
}

/**
 * PayMongo implementation of the PaymentGateway port.
 *
 * Uses the Checkout Sessions API for hosted payment pages and the
 * Refunds API for refunds. All amounts are in centavos.
 *
 * Docs: https://developers.paymongo.com/reference
 */
export class PayMongoGateway implements PaymentGateway {
  readonly id = "paymongo" as const;

  constructor(private readonly config: PayMongoConfig) {
    if (!config.secretKey) {
      throw new Error("PayMongoGateway: PAYMONGO_SECRET_KEY is required");
    }
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.config.secretKey}:`).toString("base64")}`;
  }

  private async request<T>(
    path: string,
    body: unknown,
  ): Promise<PayMongoResource<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${PAYMONGO_API_URL}${path}`, {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { attributes: body } }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error(
          `[paymongo] ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`,
        );
        throw new PaymentError(
          "PAYMENT_PROVIDER_TIMEOUT",
          "The payment provider took too long to respond. Please try again.",
        );
      }
      console.error(`[paymongo] ${path} network error:`, error);
      throw new PaymentError(
        "PAYMENT_PROVIDER_UNREACHABLE",
        "Could not reach the payment provider. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
    }

    const json = (await response.json().catch(() => null)) as
      | { data: PayMongoResource<T> }
      | (PayMongoErrorBody & { data?: undefined })
      | null;

    if (!response.ok || !json?.data) {
      const detail =
        (json as PayMongoErrorBody | null)?.errors?.[0]?.detail ??
        `PayMongo request failed with status ${response.status}`;
      console.error(`[paymongo] ${path} failed:`, detail);
      throw new PaymentError("PAYMENT_PROVIDER_ERROR", detail);
    }

    return json.data;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CheckoutSession> {
    if (!SUPPORTED_CURRENCIES.includes(params.currency.toUpperCase())) {
      throw new PaymentError(
        "UNSUPPORTED_CURRENCY",
        `PayMongo does not support ${params.currency}. Supported: ${SUPPORTED_CURRENCIES.join(", ")}.`,
      );
    }

    const session = await this.request<{
      checkout_url: string;
    }>("/checkout_sessions", {
      line_items: [
        {
          name: params.description,
          amount: params.amountMinor,
          currency: params.currency,
          quantity: 1,
        },
      ],
      payment_method_types: PAYMENT_METHOD_TYPES,
      description: params.description,
      reference_number: params.transactionId,
      send_email_receipt: true,
      show_description: true,
      show_line_items: true,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      ...(params.customerEmail
        ? { billing: { email: params.customerEmail } }
        : {}),
      metadata: params.metadata,
    });

    if (
      !session.id ||
      typeof session.attributes?.checkout_url !== "string" ||
      !session.attributes.checkout_url
    ) {
      console.error(
        "[paymongo] createCheckoutSession returned an unexpected shape:",
        {
          hasId: Boolean(session.id),
          hasCheckoutUrl: Boolean(session.attributes?.checkout_url),
        },
      );
      throw new PaymentError(
        "PAYMENT_PROVIDER_ERROR",
        "The payment provider returned an unexpected response. Please try again.",
      );
    }

    return {
      provider: this.id,
      sessionReference: session.id,
      checkoutUrl: session.attributes.checkout_url,
    };
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    const refund = await this.request<{ status: string }>("/refunds", {
      amount: params.amountMinor,
      payment_id: params.paymentReference,
      reason: params.reason,
      ...(params.metadata ? { metadata: params.metadata } : {}),
    });

    if (!refund.id) {
      console.error("[paymongo] createRefund returned no refund id");
      throw new PaymentError(
        "PAYMENT_PROVIDER_ERROR",
        "The payment provider returned an unexpected response for the refund. Please try again.",
      );
    }

    return {
      provider: this.id,
      refundReference: refund.id,
      status:
        refund.attributes.status === "succeeded"
          ? "succeeded"
          : refund.attributes.status === "failed"
            ? "failed"
            : "pending",
    };
  }

  /**
   * Header format: `t=<timestamp>,te=<test-mode sig>,li=<live-mode sig>`.
   * The signature is HMAC-SHA256 of `<timestamp>.<rawBody>` with the
   * webhook secret. We accept whichever mode signature is present.
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
  ): boolean {
    if (!signatureHeader || !this.config.webhookSecret) return false;

    const parts = new Map<string, string>();
    for (const segment of signatureHeader.split(",")) {
      const [key, ...rest] = segment.split("=");
      if (key && rest.length > 0) parts.set(key.trim(), rest.join("=").trim());
    }

    const timestamp = parts.get("t");
    const received = parts.get("li") || parts.get("te");
    if (!timestamp || !received) return false;

    const expected = crypto
      .createHmac("sha256", this.config.webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent {
    const event = JSON.parse(rawBody) as {
      data: {
        id: string;
        attributes: {
          type: string;
          data: {
            id: string;
            attributes: Record<string, unknown> & {
              status?: string;
              amount?: number;
              currency?: string;
              metadata?: Record<string, string> | null;
              line_items?: Array<{
                amount?: number;
                currency?: string;
                quantity?: number;
              }>;
              payments?: Array<{
                id: string;
                attributes?: { amount?: number; currency?: string };
              }>;
              payment_intent?: {
                id?: string;
                attributes?: {
                  amount?: number;
                  currency?: string;
                  payments?: Array<{
                    id: string;
                    attributes?: { amount?: number; currency?: string };
                  }>;
                };
              };
              failed_message?: string;
              failed_code?: string;
            };
          };
        };
      };
    };

    const eventId = event.data.id;
    const eventType = event.data.attributes.type;
    const resource = event.data.attributes.data;
    const attrs = resource.attributes ?? {};
    const metadata = attrs.metadata ?? {};
    const bookingId = metadata["booking_id"] ?? null;

    switch (eventType) {
      // Primary (and only trusted) success signal for hosted checkout:
      // the resource IS the checkout session we created, so its own id
      // is exactly the reference attach_payment_session stored on the
      // transaction. That equality is what confirm_booking_payment
      // reconciles against.
      case "checkout_session.payment.paid": {
        const payment =
          attrs.payments?.[0] ??
          attrs.payment_intent?.attributes?.payments?.[0];
        return {
          eventId,
          eventType,
          kind: "payment.succeeded",
          bookingId,
          checkoutSessionReference: resource.id,
          paymentReference:
            payment?.id ?? attrs.payment_intent?.id ?? resource.id,
          amountMinor:
            payment?.attributes?.amount ??
            attrs.payment_intent?.attributes?.amount ??
            lineItemAmountMinor(attrs.line_items),
          currency:
            payment?.attributes?.currency ??
            attrs.payment_intent?.attributes?.currency ??
            lineItemCurrency(attrs.line_items),
          transactionId: metadataValue(metadata, "transaction_id"),
        };
      }

      // Direct payment events carry no checkout-session id to reconcile
      // against — `resource` here is the Payment itself, not a session.
      // Rather than trust webhook-supplied metadata for correlation, we
      // report no checkout session reference and let the use-case route
      // this to manual review instead of auto-confirming.
      case "payment.paid":
        return {
          eventId,
          eventType,
          kind: "payment.succeeded",
          bookingId,
          checkoutSessionReference: null,
          paymentReference: resource.id,
          amountMinor: typeof attrs.amount === "number" ? attrs.amount : null,
          currency: attrs.currency ?? null,
          transactionId: metadataValue(metadata, "transaction_id"),
        };

      case "payment.failed":
        return {
          eventId,
          eventType,
          kind: "payment.failed",
          bookingId,
          paymentReference: resource.id,
          failureReason:
            attrs.failed_message ?? attrs.failed_code ?? attrs.status ?? null,
        };

      // Refund lifecycle. The resource is the refund object (`ref_...`).
      case "payment.refunded":
        return {
          eventId,
          eventType,
          kind: "refund.succeeded",
          refundReference: resource.id,
          amountMinor: typeof attrs.amount === "number" ? attrs.amount : null,
        };

      case "payment.refund.updated": {
        if (attrs.status === "succeeded") {
          return {
            eventId,
            eventType,
            kind: "refund.succeeded",
            refundReference: resource.id,
            amountMinor: typeof attrs.amount === "number" ? attrs.amount : null,
          };
        }
        if (attrs.status === "failed") {
          return {
            eventId,
            eventType,
            kind: "refund.failed",
            refundReference: resource.id,
            failureReason:
              (attrs["failed_reason"] as string | undefined) ?? null,
          };
        }
        return { eventId, eventType, kind: "ignored" };
      }

      default:
        return { eventId, eventType, kind: "ignored" };
    }
  }
}

export function createPayMongoGateway(): PayMongoGateway {
  return new PayMongoGateway({
    secretKey: process.env.PAYMONGO_SECRET_KEY ?? "",
    webhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET ?? "",
  });
}
