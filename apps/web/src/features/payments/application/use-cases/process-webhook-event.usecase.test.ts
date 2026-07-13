import { describe, expect, it, vi } from "vitest";
import { processWebhookEvent } from "./process-webhook-event.usecase";
import type { PaymentGateway } from "../../domain/gateways/payment-gateway.port";

/**
 * These tests cover OUR orchestration logic — dispatch, idempotency
 * claiming, and error-to-status mapping — with a mocked Supabase
 * client. They intentionally do NOT assert that Postgres itself
 * enforces amount/currency/reference reconciliation: that enforcement
 * lives in confirm_booking_payment (SQL) and is verified against a
 * real database in the production test-mode validation pass, not here.
 */

function makeFakeSupabase(rpcImpl: (fn: string, args: unknown) => { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn((fn: string, args: unknown) => Promise.resolve(rpcImpl(fn, args))),
  };
}

function makeFakeGateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
  return {
    id: "paymongo",
    createCheckoutSession: vi.fn(),
    createRefund: vi.fn(),
    verifyWebhookSignature: vi.fn().mockReturnValue(true),
    parseWebhookEvent: vi.fn(),
    ...overrides,
  };
}

describe("processWebhookEvent", () => {
  it("returns invalid_signature and never claims the event when the signature fails", async () => {
    const gateway = makeFakeGateway({ verifyWebhookSignature: vi.fn().mockReturnValue(false) });
    const supabase = makeFakeSupabase(() => ({ data: null, error: null }));

    const result = await processWebhookEvent(supabase as any, gateway, "{}", "bad-sig");

    expect(result).toEqual({ ok: false, result: "invalid_signature" });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("returns duplicate and does not dispatch when claim_payment_webhook_event reports already-claimed", async () => {
    const gateway = makeFakeGateway({
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_1",
        eventType: "payment.paid",
        kind: "payment.succeeded",
        bookingId: "b1",
        checkoutSessionReference: "cs_1",
        paymentReference: "pay_1",
        amountMinor: 1000,
        currency: "PHP",
      }),
    });
    const supabase = makeFakeSupabase((fn) => {
      if (fn === "claim_payment_webhook_event") return { data: false, error: null };
      throw new Error(`unexpected call to ${fn}`);
    });

    const result = await processWebhookEvent(supabase as any, gateway, "{}", "sig");

    expect(result).toEqual({ ok: true, result: "duplicate" });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("claim_payment_webhook_event", expect.anything());
  });

  it("skips (does not confirm) a payment.succeeded event with no checkout session reference", async () => {
    const gateway = makeFakeGateway({
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_2",
        eventType: "payment.paid",
        kind: "payment.succeeded",
        bookingId: "b1",
        checkoutSessionReference: null,
        paymentReference: "pay_2",
        amountMinor: 1000,
        currency: "PHP",
      }),
    });
    const rpcCalls: string[] = [];
    const supabase = makeFakeSupabase((fn) => {
      rpcCalls.push(fn);
      if (fn === "claim_payment_webhook_event") return { data: true, error: null };
      if (fn === "finish_payment_webhook_event") return { data: null, error: null };
      throw new Error(`confirm_booking_payment must not be called: ${fn}`);
    });

    const result = await processWebhookEvent(supabase as any, gateway, "{}", "sig");

    expect(result).toEqual({ ok: true, result: "skipped" });
    expect(rpcCalls).not.toContain("confirm_booking_payment");
    expect(rpcCalls).toContain("finish_payment_webhook_event");
  });

  it("calls confirm_booking_payment with the checkout reference (not booking id) for a reconcilable event", async () => {
    const gateway = makeFakeGateway({
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_3",
        eventType: "checkout_session.payment.paid",
        kind: "payment.succeeded",
        bookingId: "b1",
        checkoutSessionReference: "cs_reconcile",
        paymentReference: "pay_3",
        amountMinor: 150000,
        currency: "PHP",
      }),
    });
    let confirmArgs: unknown = null;
    const supabase = makeFakeSupabase((fn, args) => {
      if (fn === "claim_payment_webhook_event") return { data: true, error: null };
      if (fn === "confirm_booking_payment") {
        confirmArgs = args;
        return { data: {}, error: null };
      }
      if (fn === "finish_payment_webhook_event") return { data: null, error: null };
      throw new Error(`unexpected call to ${fn}`);
    });

    const result = await processWebhookEvent(supabase as any, gateway, "{}", "sig");

    expect(result).toEqual({ ok: true, result: "processed" });
    expect(confirmArgs).toMatchObject({
      p_payment_provider: "paymongo",
      p_checkout_reference: "cs_reconcile",
      p_payment_reference: "pay_3",
      p_amount_minor: 150000,
      p_currency: "PHP",
    });
    // The booking id must never be forwarded as the correlation key —
    // the RPC derives it itself from the matched transaction row.
    expect(confirmArgs).not.toHaveProperty("p_booking_id");
  });

  it("reconciles a direct payment.paid event through validated transaction metadata", async () => {
    const gateway = makeFakeGateway({
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_direct",
        eventType: "payment.paid",
        kind: "payment.succeeded",
        bookingId: "booking-1",
        transactionId: "transaction-1",
        checkoutSessionReference: null,
        paymentReference: "pay_direct",
        amountMinor: 150000,
        currency: "PHP",
      }),
    });
    let confirmArgs: unknown = null;
    const supabase = {
      rpc: vi.fn((fn: string, args: unknown) => {
        if (fn === "claim_payment_webhook_event") return Promise.resolve({ data: true, error: null });
        if (fn === "confirm_booking_payment") {
          confirmArgs = args;
          return Promise.resolve({ data: {}, error: null });
        }
        if (fn === "finish_payment_webhook_event") return Promise.resolve({ data: null, error: null });
        throw new Error(`unexpected call to ${fn}`);
      }),
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "transaction-1",
            booking_id: "booking-1",
            provider_reference: "cs_created_by_venora",
            amount: 1500,
            currency: "PHP",
            status: "pending",
            payment_kind: "deposit",
          },
        }),
      })),
    };

    const result = await processWebhookEvent(supabase as any, gateway, "{}", "sig");

    expect(result).toEqual({ ok: true, result: "processed" });
    expect(confirmArgs).toMatchObject({
      p_payment_provider: "paymongo",
      p_checkout_reference: "cs_created_by_venora",
      p_payment_reference: "pay_direct",
      p_amount_minor: 150000,
      p_currency: "PHP",
    });
  });

  it("marks the event failed (not processed) when confirm_booking_payment returns an error", async () => {
    const gateway = makeFakeGateway({
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_4",
        eventType: "checkout_session.payment.paid",
        kind: "payment.succeeded",
        bookingId: "b1",
        checkoutSessionReference: "cs_mismatch",
        paymentReference: "pay_4",
        amountMinor: 999,
        currency: "PHP",
      }),
    });
    const finishCalls: unknown[] = [];
    const supabase = makeFakeSupabase((fn, args) => {
      if (fn === "claim_payment_webhook_event") return { data: true, error: null };
      if (fn === "confirm_booking_payment") {
        return { data: null, error: { message: "Reconciliation failed: amount mismatch" } };
      }
      if (fn === "finish_payment_webhook_event") {
        finishCalls.push(args);
        return { data: null, error: null };
      }
      throw new Error(`unexpected call to ${fn}`);
    });

    const result = await processWebhookEvent(supabase as any, gateway, "{}", "sig");

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ result: "failed" });
    expect(finishCalls[0]).toMatchObject({ p_status: "failed" });
  });

  it("dispatches refund.succeeded to complete_booking_refund", async () => {
    const gateway = makeFakeGateway({
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_5",
        eventType: "payment.refunded",
        kind: "refund.succeeded",
        refundReference: "ref_1",
        amountMinor: 5000,
      }),
    });
    const rpcCalls: string[] = [];
    const supabase = makeFakeSupabase((fn) => {
      rpcCalls.push(fn);
      if (fn === "claim_payment_webhook_event") return { data: true, error: null };
      if (fn === "complete_booking_refund") return { data: {}, error: null };
      if (fn === "finish_payment_webhook_event") return { data: null, error: null };
      throw new Error(`unexpected call to ${fn}`);
    });

    const result = await processWebhookEvent(supabase as any, gateway, "{}", "sig");

    expect(result).toEqual({ ok: true, result: "processed" });
    expect(rpcCalls).toContain("complete_booking_refund");
  });

  it("records an ignored event as skipped without dispatching any confirmation RPC", async () => {
    const gateway = makeFakeGateway({
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_6",
        eventType: "subscription.activated",
        kind: "ignored",
      }),
    });
    const rpcCalls: string[] = [];
    const supabase = makeFakeSupabase((fn) => {
      rpcCalls.push(fn);
      if (fn === "claim_payment_webhook_event") return { data: true, error: null };
      if (fn === "finish_payment_webhook_event") return { data: null, error: null };
      throw new Error(`unexpected call to ${fn}`);
    });

    const result = await processWebhookEvent(supabase as any, gateway, "{}", "sig");

    expect(result).toEqual({ ok: true, result: "skipped" });
    expect(rpcCalls).not.toContain("confirm_booking_payment");
    expect(rpcCalls).not.toContain("complete_booking_refund");
  });
});
