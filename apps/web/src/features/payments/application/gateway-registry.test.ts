import { beforeEach, describe, expect, it, vi } from "vitest";

describe("gateway-registry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("resolves a registered gateway and caches the instance", async () => {
    const { registerGateway, getGateway } = await import("./gateway-registry");
    const factory = vi.fn(() => ({ id: "paymongo" as const }) as any);
    registerGateway("paymongo", factory);

    const first = getGateway("paymongo");
    const second = getGateway("paymongo");

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it("throws PaymentProviderNotAvailableError for an unregistered provider", async () => {
    const { getGateway, PaymentProviderNotAvailableError } =
      await import("./gateway-registry");
    expect(() => getGateway("stripe")).toThrow(
      PaymentProviderNotAvailableError,
    );
  });

  it("listAvailableProviders reflects only registered providers", async () => {
    const { registerGateway, listAvailableProviders } =
      await import("./gateway-registry");
    registerGateway("paymongo", () => ({ id: "paymongo" as const }) as any);

    expect(listAvailableProviders()).toEqual(["paymongo"]);
  });

  it("isGatewayAvailable is false before registration and true after", async () => {
    const { registerGateway, isGatewayAvailable } =
      await import("./gateway-registry");
    expect(isGatewayAvailable("paymongo")).toBe(false);
    registerGateway("paymongo", () => ({ id: "paymongo" as const }) as any);
    expect(isGatewayAvailable("paymongo")).toBe(true);
  });
});
