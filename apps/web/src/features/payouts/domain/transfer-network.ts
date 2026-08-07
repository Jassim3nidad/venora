import type { TransferNetwork } from "./gateways/disbursement-gateway.port";

/**
 * Rail selection. Pure business logic, deliberately outside the adapter:
 * it encodes PayMongo's published limits, not their wire format, and needs
 * to be unit-testable without touching HTTP.
 *
 * Published limits: InstaPay settles in real time but caps at PHP 50,000
 * per transaction; PESONet clears same/next banking day up to PHP 10M.
 */

/** PHP 50,000 in centavos. */
export const INSTAPAY_MAX_MINOR = 5_000_000;
/** PHP 10,000,000 in centavos. */
export const PESONET_MAX_MINOR = 1_000_000_000;

/**
 * `auto` picks a rail per transfer; the explicit modes pin every transfer
 * to one rail, which is what an operator wants while diagnosing a
 * provider-side problem with one of them.
 */
export type NetworkMode = "auto" | "instapay" | "pesonet";

export function parseNetworkMode(value: string | undefined): NetworkMode {
  return value === "instapay" || value === "pesonet" ? value : "auto";
}

export interface NetworkResolution {
  network: TransferNetwork;
  /** Why this rail was chosen — recorded in the audit log. */
  reason: string;
}

export class TransferNetworkError extends Error {}

/**
 * Chooses the rail for one transfer.
 *
 * Precedence is mode → account listing → amount. The account's own listing
 * outranks the amount heuristic because an institution that only appears
 * under PESONet cannot receive an InstaPay transfer at any amount, so
 * routing purely on size would produce a guaranteed rejection.
 */
export function resolveTransferNetwork(input: {
  amountMinor: number;
  /** Rail the destination institution was listed under, when known. */
  accountNetwork: TransferNetwork | null;
  mode: NetworkMode;
}): NetworkResolution {
  const { amountMinor, accountNetwork, mode } = input;

  if (amountMinor <= 0) {
    throw new TransferNetworkError(
      "Transfer amount must be greater than zero.",
    );
  }

  if (amountMinor > PESONET_MAX_MINOR) {
    throw new TransferNetworkError(
      "Amount exceeds the PHP 10,000,000 per-transfer ceiling. Split it into smaller withdrawals.",
    );
  }

  if (mode !== "auto") {
    if (mode === "instapay" && amountMinor > INSTAPAY_MAX_MINOR) {
      throw new TransferNetworkError(
        "Transfers are pinned to InstaPay, which caps at PHP 50,000. Lower the amount or switch the network mode.",
      );
    }
    return { network: mode, reason: `pinned by configuration to ${mode}` };
  }

  if (accountNetwork === "pesonet") {
    return { network: "pesonet", reason: "institution is listed on PESONet" };
  }

  if (accountNetwork === "instapay" && amountMinor > INSTAPAY_MAX_MINOR) {
    throw new TransferNetworkError(
      "This institution is listed on InstaPay, which caps at PHP 50,000. Withdraw a smaller amount.",
    );
  }

  if (amountMinor > INSTAPAY_MAX_MINOR) {
    return { network: "pesonet", reason: "amount exceeds the InstaPay cap" };
  }

  return { network: "instapay", reason: "within the InstaPay cap" };
}
