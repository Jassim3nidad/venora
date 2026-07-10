import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startCheckout } from "./start-checkout.usecase";

vi.mock("@/src/features/payments/application/gateway-registry", () => ({
  getGateway: vi.fn(),
}));

describe("startCheckout URL validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects checkout creation when production appUrl is missing", async () => {
    process.env.NODE_ENV = "production";
    
    await expect(
      startCheckout(null as any, null as any, {
        bookingId: "b-1",
        provider: "paymongo",
        appUrl: "",
      })
    ).rejects.toThrow("Production application URL is missing.");
  });

  it("rejects checkout creation when production appUrl is not HTTPS", async () => {
    process.env.NODE_ENV = "production";
    
    await expect(
      startCheckout(null as any, null as any, {
        bookingId: "b-1",
        provider: "paymongo",
        appUrl: "http://venora-web.vercel.app",
      })
    ).rejects.toThrow("Production application URL must use HTTPS.");
  });

  it("rejects checkout creation when production appUrl is localhost", async () => {
    process.env.NODE_ENV = "production";
    
    await expect(
      startCheckout(null as any, null as any, {
        bookingId: "b-1",
        provider: "paymongo",
        appUrl: "https://localhost:3000",
      })
    ).rejects.toThrow("Production application URL cannot be localhost.");

    await expect(
      startCheckout(null as any, null as any, {
        bookingId: "b-1",
        provider: "paymongo",
        appUrl: "https://127.0.0.1",
      })
    ).rejects.toThrow("Production application URL cannot be localhost.");
  });
});
