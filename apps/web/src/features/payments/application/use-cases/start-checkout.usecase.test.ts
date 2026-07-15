import { describe, it, expect, vi, afterEach } from "vitest";
import { startCheckout } from "./start-checkout.usecase";
import { getGateway } from "@/src/features/payments/application/gateway-registry";

vi.mock("@/src/features/payments/application/gateway-registry", () => ({
  getGateway: vi.fn(),
}));

describe("startCheckout URL validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("rejects checkout creation when production appUrl is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      startCheckout(null as any, null as any, {
        bookingId: "b-1",
        provider: "paymongo",
        appUrl: "",
      }),
    ).rejects.toThrow("Production application URL is missing.");
  });

  it("rejects checkout creation when production appUrl is not HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      startCheckout(null as any, null as any, {
        bookingId: "b-1",
        provider: "paymongo",
        appUrl: "http://venora-web.vercel.app",
      }),
    ).rejects.toThrow("Production application URL must use HTTPS.");
  });

  it("rejects checkout creation when production appUrl is localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      startCheckout(null as any, null as any, {
        bookingId: "b-1",
        provider: "paymongo",
        appUrl: "https://localhost:3000",
      }),
    ).rejects.toThrow("Production application URL cannot be localhost.");

    await expect(
      startCheckout(null as any, null as any, {
        bookingId: "b-1",
        provider: "paymongo",
        appUrl: "https://127.0.0.1",
      }),
    ).rejects.toThrow("Production application URL cannot be localhost.");
  });

  it("reuses a non-stale checkout session instead of creating a duplicate provider session", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const gateway = {
      createCheckoutSession: vi.fn(),
    };
    vi.mocked(getGateway).mockReturnValue(gateway as any);

    const transaction = {
      id: "transaction-1",
      amount: 1500,
      currency: "PHP",
      payment_provider: "paymongo",
      provider_reference: "cs_existing",
      checkout_url: "https://checkout.paymongo.com/cs_existing",
      status: "pending",
      created_at: new Date().toISOString(),
    };
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: transaction, error: null }),
    };
    const serviceClient = {
      rpc: vi.fn(),
    };

    const result = await startCheckout(supabase as any, serviceClient as any, {
      bookingId: "booking-1",
      provider: "paymongo",
      appUrl: "https://venora-web.vercel.app",
    });

    expect(result.checkoutUrl).toBe(transaction.checkout_url);
    expect(result.transactionId).toBe(transaction.id);
    expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
    expect(serviceClient.rpc).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
});
