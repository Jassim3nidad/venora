import { describe, expect, it } from "vitest";
import {
  INSTAPAY_MAX_MINOR,
  PESONET_MAX_MINOR,
  parseNetworkMode,
  resolveTransferNetwork,
  TransferNetworkError,
} from "./transfer-network";

const auto = { mode: "auto" as const, accountNetwork: null };

describe("parseNetworkMode", () => {
  it("defaults to auto for anything unrecognised", () => {
    expect(parseNetworkMode(undefined)).toBe("auto");
    expect(parseNetworkMode("")).toBe("auto");
    expect(parseNetworkMode("swift")).toBe("auto");
  });

  it("accepts the two documented rails", () => {
    expect(parseNetworkMode("instapay")).toBe("instapay");
    expect(parseNetworkMode("pesonet")).toBe("pesonet");
  });
});

describe("resolveTransferNetwork — automatic routing", () => {
  it("uses InstaPay at and below its cap", () => {
    expect(
      resolveTransferNetwork({ ...auto, amountMinor: INSTAPAY_MAX_MINOR })
        .network,
    ).toBe("instapay");
  });

  it("switches to PESONet one centavo above the cap", () => {
    expect(
      resolveTransferNetwork({ ...auto, amountMinor: INSTAPAY_MAX_MINOR + 1 })
        .network,
    ).toBe("pesonet");
  });

  it("rejects an amount above the PESONet ceiling before any API call", () => {
    expect(() =>
      resolveTransferNetwork({ ...auto, amountMinor: PESONET_MAX_MINOR + 1 }),
    ).toThrow(TransferNetworkError);
  });

  it("rejects a non-positive amount", () => {
    expect(() => resolveTransferNetwork({ ...auto, amountMinor: 0 })).toThrow(
      TransferNetworkError,
    );
  });
});

describe("resolveTransferNetwork — institution listing wins over amount", () => {
  it("routes a small amount over PESONet when the institution is PESONet-only", () => {
    // Routing purely on size would pick InstaPay and be rejected, because
    // the institution is not reachable on that rail at any amount.
    const result = resolveTransferNetwork({
      amountMinor: 10_000,
      accountNetwork: "pesonet",
      mode: "auto",
    });
    expect(result.network).toBe("pesonet");
  });

  it("refuses an InstaPay-only institution above the InstaPay cap", () => {
    expect(() =>
      resolveTransferNetwork({
        amountMinor: INSTAPAY_MAX_MINOR + 1,
        accountNetwork: "instapay",
        mode: "auto",
      }),
    ).toThrow(/caps at PHP 50,000/);
  });
});

describe("resolveTransferNetwork — pinned modes", () => {
  it("pins every transfer to the configured rail", () => {
    expect(
      resolveTransferNetwork({
        amountMinor: 1_000,
        accountNetwork: "instapay",
        mode: "pesonet",
      }).network,
    ).toBe("pesonet");
  });

  it("still refuses to pin to InstaPay above its cap", () => {
    expect(() =>
      resolveTransferNetwork({
        amountMinor: INSTAPAY_MAX_MINOR + 1,
        accountNetwork: null,
        mode: "instapay",
      }),
    ).toThrow(TransferNetworkError);
  });

  it("explains why a rail was chosen, for the audit log", () => {
    expect(
      resolveTransferNetwork({ ...auto, amountMinor: 1_000 }).reason,
    ).toMatch(/InstaPay cap/i);
  });
});
