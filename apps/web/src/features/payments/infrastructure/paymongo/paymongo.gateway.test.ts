import crypto from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PayMongoGateway } from "./paymongo.gateway";

const WEBHOOK_SECRET = "whsk_test_secret_for_unit_tests_only";

function sign(rawBody: string, timestamp: number, secret: string, mode: "te" | "li" = "te") {
  const hmac = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},${mode}=${hmac}`;
}

function makeGateway(overrides: Partial<{ secretKey: string; webhookSecret: string }> = {}) {
  return new PayMongoGateway({
    secretKey: overrides.secretKey ?? "sk_test_dummy",
    webhookSecret: overrides.webhookSecret ?? WEBHOOK_SECRET,
  });
}

describe("PayMongoGateway.verifyWebhookSignature", () => {
  it("accepts a valid test-mode (te=) signature", () => {
    const gateway = makeGateway();
    const body = JSON.stringify({ hello: "world" });
    const header = sign(body, Math.floor(Date.now() / 1000), WEBHOOK_SECRET, "te");
    expect(gateway.verifyWebhookSignature(body, header)).toBe(true);
  });

  it("accepts a valid live-mode (li=) signature", () => {
    const gateway = makeGateway();
    const body = JSON.stringify({ hello: "world" });
    const header = sign(body, Math.floor(Date.now() / 1000), WEBHOOK_SECRET, "li");
    expect(gateway.verifyWebhookSignature(body, header)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const gateway = makeGateway();
    const body = JSON.stringify({ hello: "world" });
    const header = sign(body, Math.floor(Date.now() / 1000), "wrong_secret", "te");
    expect(gateway.verifyWebhookSignature(body, header)).toBe(false);
  });

  it("rejects a signature computed over a different (tampered) body", () => {
    const gateway = makeGateway();
    const originalBody = JSON.stringify({ amount: 100 });
    const tamperedBody = JSON.stringify({ amount: 999999 });
    const header = sign(originalBody, Math.floor(Date.now() / 1000), WEBHOOK_SECRET, "te");
    expect(gateway.verifyWebhookSignature(tamperedBody, header)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const gateway = makeGateway();
    expect(gateway.verifyWebhookSignature("{}", null)).toBe(false);
  });

  it("rejects a malformed signature header", () => {
    const gateway = makeGateway();
    expect(gateway.verifyWebhookSignature("{}", "not-a-valid-header")).toBe(false);
  });

  it("rejects when no webhook secret is configured", () => {
    const gateway = makeGateway({ webhookSecret: "" });
    const body = JSON.stringify({ hello: "world" });
    const header = sign(body, Math.floor(Date.now() / 1000), WEBHOOK_SECRET, "te");
    expect(gateway.verifyWebhookSignature(body, header)).toBe(false);
  });

  it("rejects a signature of different length without throwing", () => {
    const gateway = makeGateway();
    const header = "t=123,te=short";
    expect(() => gateway.verifyWebhookSignature("{}", header)).not.toThrow();
    expect(gateway.verifyWebhookSignature("{}", header)).toBe(false);
  });
});

describe("PayMongoGateway.parseWebhookEvent", () => {
  const gateway = makeGateway();

  function event(type: string, dataId: string, attributes: Record<string, unknown>) {
    return JSON.stringify({
      data: {
        id: `evt_${type}_1`,
        attributes: {
          type,
          data: { id: dataId, attributes },
        },
      },
    });
  }

  it("normalizes checkout_session.payment.paid using the session id as the checkout reference", () => {
    const raw = event("checkout_session.payment.paid", "cs_abc123", {
      metadata: { booking_id: "booking-1" },
      payments: [{ id: "pay_xyz789", attributes: { amount: 150000, currency: "PHP" } }],
    });

    const result = gateway.parseWebhookEvent(raw);

    expect(result.kind).toBe("payment.succeeded");
    if (result.kind === "payment.succeeded") {
      expect(result.checkoutSessionReference).toBe("cs_abc123");
      expect(result.paymentReference).toBe("pay_xyz789");
      expect(result.amountMinor).toBe(150000);
      expect(result.currency).toBe("PHP");
      expect(result.bookingId).toBe("booking-1");
    }
  });

  it("normalizes a direct payment.paid event with NO checkout session reference", () => {
    const raw = event("payment.paid", "pay_direct1", {
      amount: 50000,
      currency: "PHP",
      metadata: { booking_id: "booking-2" },
    });

    const result = gateway.parseWebhookEvent(raw);

    expect(result.kind).toBe("payment.succeeded");
    if (result.kind === "payment.succeeded") {
      // This is the critical reconciliation-safety property: a direct
      // payment event must never carry a checkout session reference,
      // since we cannot verify it correlates to a session WE created.
      expect(result.checkoutSessionReference).toBeNull();
    }
  });

  it("normalizes payment.failed with a failure reason", () => {
    const raw = event("payment.failed", "pay_fail1", {
      failed_message: "Card declined",
      metadata: { booking_id: "booking-3" },
    });

    const result = gateway.parseWebhookEvent(raw);

    expect(result.kind).toBe("payment.failed");
    if (result.kind === "payment.failed") {
      expect(result.failureReason).toBe("Card declined");
      expect(result.bookingId).toBe("booking-3");
    }
  });

  it("normalizes payment.refunded as refund.succeeded", () => {
    const raw = event("payment.refunded", "ref_123", { amount: 25000 });
    const result = gateway.parseWebhookEvent(raw);
    expect(result.kind).toBe("refund.succeeded");
    if (result.kind === "refund.succeeded") {
      expect(result.refundReference).toBe("ref_123");
      expect(result.amountMinor).toBe(25000);
    }
  });

  it("normalizes payment.refund.updated (succeeded) as refund.succeeded", () => {
    const raw = event("payment.refund.updated", "ref_456", { status: "succeeded", amount: 10000 });
    const result = gateway.parseWebhookEvent(raw);
    expect(result.kind).toBe("refund.succeeded");
  });

  it("normalizes payment.refund.updated (failed) as refund.failed", () => {
    const raw = event("payment.refund.updated", "ref_789", { status: "failed", failed_reason: "insufficient" });
    const result = gateway.parseWebhookEvent(raw);
    expect(result.kind).toBe("refund.failed");
    if (result.kind === "refund.failed") {
      expect(result.failureReason).toBe("insufficient");
    }
  });

  it("normalizes payment.refund.updated (pending) as ignored", () => {
    const raw = event("payment.refund.updated", "ref_999", { status: "pending" });
    const result = gateway.parseWebhookEvent(raw);
    expect(result.kind).toBe("ignored");
  });

  it("normalizes an unknown event type as ignored", () => {
    const raw = event("subscription.activated", "sub_1", {});
    const result = gateway.parseWebhookEvent(raw);
    expect(result.kind).toBe("ignored");
  });
});

describe("PayMongoGateway.createCheckoutSession", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects an unsupported currency before calling the provider", async () => {
    const gateway = makeGateway();
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await expect(
      gateway.createCheckoutSession({
        bookingId: "b1",
        transactionId: "t1",
        amountMinor: 10000,
        currency: "USD",
        description: "test",
        successUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/cancel",
        metadata: {},
      }),
    ).rejects.toThrow(/does not support USD/i);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws when the provider response is missing a checkout_url", async () => {
    const gateway = makeGateway();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "cs_1", attributes: {} } }),
    }) as unknown as typeof fetch;

    await expect(
      gateway.createCheckoutSession({
        bookingId: "b1",
        transactionId: "t1",
        amountMinor: 10000,
        currency: "PHP",
        description: "test",
        successUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/cancel",
        metadata: {},
      }),
    ).rejects.toThrow(/unexpected response/i);
  });

  it("throws a provider-error when the HTTP response is not ok", async () => {
    const gateway = makeGateway();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ errors: [{ detail: "Invalid API key" }] }),
    }) as unknown as typeof fetch;

    await expect(
      gateway.createCheckoutSession({
        bookingId: "b1",
        transactionId: "t1",
        amountMinor: 10000,
        currency: "PHP",
        description: "test",
        successUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/cancel",
        metadata: {},
      }),
    ).rejects.toThrow(/Invalid API key/);
  });

  it("succeeds and returns the session reference + checkout url on a valid response", async () => {
    const gateway = makeGateway();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: "cs_valid", attributes: { checkout_url: "https://checkout.paymongo.com/cs_valid" } },
      }),
    }) as unknown as typeof fetch;

    const session = await gateway.createCheckoutSession({
      bookingId: "b1",
      transactionId: "t1",
      amountMinor: 10000,
      currency: "PHP",
      description: "test",
      successUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
      metadata: {},
    });

    expect(session.sessionReference).toBe("cs_valid");
    expect(session.checkoutUrl).toBe("https://checkout.paymongo.com/cs_valid");
    expect(session.provider).toBe("paymongo");
  });
});
