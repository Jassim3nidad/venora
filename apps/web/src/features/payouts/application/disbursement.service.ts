import type { SupabaseClient } from "@supabase/supabase-js";
import { toMinorUnits } from "@/features/payments/domain/value-objects/money.vo";
import { PaymentError } from "@/lib/errors";
import type {
  DisbursementGateway,
  TransferNetwork,
  TransferResult,
} from "../domain/gateways/disbursement-gateway.port";
import {
  parseNetworkMode,
  resolveTransferNetwork,
  TransferNetworkError,
} from "../domain/transfer-network";
import { decryptAccountIdentifier } from "./payout-encryption";

/**
 * Orchestrates one withdrawal → one Treasury transfer.
 *
 * Sits between the approval workflow and the provider adapter: it owns
 * the state machine and knows nothing about PayMongo's payload format,
 * while the adapter owns the payload and knows nothing about withdrawals.
 *
 * Runs on the service-role client — the only role that can read the
 * encrypted account identifier and call the disbursement RPCs.
 */

export type DisbursementOutcome =
  | { ok: true; result: "sent" | "settled" | "not_claimable" }
  | { ok: false; result: "failed" | "needs_reconciliation"; error: string };

interface PayoutAccountSecret {
  method: string;
  account_name: string;
  account_identifier_ciphertext: string;
  institution_code: string | null;
  institution_name: string | null;
  network: string | null;
  verified_at: string | null;
  archived_at: string | null;
}

/**
 * Provider errors where the transfer may already exist. Releasing funds on
 * these risks paying twice once the transfer lands, so the withdrawal is
 * left in `processing` for reconciliation instead.
 */
const AMBIGUOUS_ERROR_CODES = new Set([
  "DISBURSEMENT_PROVIDER_TIMEOUT",
  "DISBURSEMENT_PROVIDER_UNREACHABLE",
]);

function toAccountNetwork(value: string | null): TransferNetwork | null {
  return value === "instapay" || value === "pesonet" ? value : null;
}

export async function dispatchWithdrawal(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  withdrawalId: string,
): Promise<DisbursementOutcome> {
  // Claim first: flips approved -> processing and only succeeds once, so a
  // retried or concurrent dispatch cannot create a second transfer.
  const { data: claimed, error: claimError } = await serviceClient.rpc(
    "begin_withdrawal_disbursement",
    { p_request_id: withdrawalId, p_provider: gateway.id },
  );

  if (claimError) {
    return { ok: false, result: "failed", error: claimError.message };
  }
  if (!claimed) {
    return { ok: true, result: "not_claimable" };
  }

  const withdrawal = claimed as {
    id: string;
    amount: number;
    currency: string;
    payout_account_id: string;
  };

  const { data: account, error: accountError } = await serviceClient
    .from("payout_accounts")
    .select(
      "method, account_name, account_identifier_ciphertext, institution_code, " +
        "institution_name, network, verified_at, archived_at",
    )
    .eq("id", withdrawal.payout_account_id)
    .maybeSingle<PayoutAccountSecret>();

  if (accountError || !account) {
    return failWithdrawal(
      serviceClient,
      gateway,
      withdrawalId,
      accountError?.message ?? "Payout account not found",
    );
  }

  // Re-checked here as well as in request_withdrawal(): an account can be
  // archived, or have verification reset by an edit, between the two.
  if (!account.verified_at || account.archived_at) {
    return failWithdrawal(
      serviceClient,
      gateway,
      withdrawalId,
      "Payout account is no longer verified.",
    );
  }

  if (!account.institution_code) {
    return failWithdrawal(
      serviceClient,
      gateway,
      withdrawalId,
      "Payout account has no institution code. It must be re-entered with a supported institution.",
    );
  }

  const amountMinor = toMinorUnits(Number(withdrawal.amount));

  let network: TransferNetwork;
  let networkReason: string;
  try {
    const resolved = resolveTransferNetwork({
      amountMinor,
      accountNetwork: toAccountNetwork(account.network),
      mode: parseNetworkMode(process.env.PAYMONGO_TRANSFER_NETWORK_MODE),
    });
    network = resolved.network;
    networkReason = resolved.reason;
  } catch (error) {
    return failWithdrawal(
      serviceClient,
      gateway,
      withdrawalId,
      error instanceof TransferNetworkError
        ? error.message
        : "Could not determine a transfer network.",
    );
  }

  let transfer: TransferResult;
  try {
    // Plaintext exists only within this call's stack — never logged,
    // never attached to an error, never returned.
    const accountNumber = decryptAccountIdentifier(
      account.account_identifier_ciphertext,
    );

    transfer = await gateway.createTransfer({
      reference: withdrawal.id,
      amountMinor,
      currency: withdrawal.currency,
      network,
      destination: {
        accountNumber,
        accountName: account.account_name,
        institutionCode: account.institution_code,
        institutionName: account.institution_name,
      },
      description: `Venora payout ${withdrawal.id}`,
      metadata: { withdrawal_id: withdrawal.id, network_reason: networkReason },
    });
  } catch (error) {
    const code = error instanceof PaymentError ? error.code : "";
    const message =
      error instanceof Error ? error.message : "Disbursement failed";

    if (AMBIGUOUS_ERROR_CODES.has(code)) {
      console.error(
        `[payouts] Withdrawal ${withdrawalId} left in flight after ${code}; awaiting reconciliation.`,
      );
      return { ok: false, result: "needs_reconciliation", error: message };
    }

    return failWithdrawal(serviceClient, gateway, withdrawalId, message);
  }

  // Persist identifiers before acting on status, so a crash here still
  // leaves something to reconcile against.
  await serviceClient.rpc("attach_withdrawal_transfer", {
    p_request_id: withdrawal.id,
    p_provider: gateway.id,
    p_transfer_id: transfer.transferId,
    p_batch_transfer_id: transfer.batchTransferId,
    p_provider_reference_number: transfer.providerReferenceNumber,
  });

  return applyTransferStatus(serviceClient, gateway, withdrawal.id, transfer);
}

/**
 * Reconciles one withdrawal against the provider's authoritative status.
 *
 * This is what the callback and any scheduled sweep both call. The
 * provider's callback body is undocumented, so it is never parsed for
 * status — it only tells us *when* to re-read.
 */
export async function syncWithdrawalStatus(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  withdrawalId: string,
): Promise<DisbursementOutcome> {
  const { data, error } = await serviceClient
    .from("withdrawal_requests")
    .select("id, status, provider_reference")
    .eq("id", withdrawalId)
    .maybeSingle<{
      id: string;
      status: string;
      provider_reference: string | null;
    }>();

  if (error || !data) {
    return {
      ok: false,
      result: "failed",
      error: error?.message ?? "Withdrawal not found",
    };
  }

  // Terminal states are never revisited.
  if (data.status === "paid" || data.status === "failed") {
    return { ok: true, result: "settled" };
  }
  if (data.status !== "processing" || !data.provider_reference) {
    return { ok: true, result: "not_claimable" };
  }

  let transfer: TransferResult;
  try {
    transfer = await gateway.getTransfer(data.provider_reference);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Status lookup failed";
    // A failed lookup says nothing about the transfer; leave it in flight.
    return { ok: false, result: "needs_reconciliation", error: message };
  }

  return applyTransferStatus(serviceClient, gateway, data.id, transfer);
}

/**
 * Maps a provider status onto the withdrawal state machine.
 *
 * `pending` is deliberately inert — a withdrawal is only ever marked paid
 * on an explicit `succeeded`.
 */
async function applyTransferStatus(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  withdrawalId: string,
  transfer: TransferResult,
): Promise<DisbursementOutcome> {
  if (transfer.status === "succeeded") {
    const { error } = await serviceClient.rpc("settle_withdrawal_request", {
      p_provider: gateway.id,
      p_withdrawal_id: withdrawalId,
      p_provider_reference: transfer.transferId,
    });
    if (error) return { ok: false, result: "failed", error: error.message };
    return { ok: true, result: "settled" };
  }

  if (transfer.status === "failed") {
    return failWithdrawal(
      serviceClient,
      gateway,
      withdrawalId,
      "The payout provider reported the transfer as failed.",
      transfer.transferId,
    );
  }

  return { ok: true, result: "sent" };
}

/** Marks the withdrawal failed, releasing its payouts back to available. */
async function failWithdrawal(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  withdrawalId: string,
  reason: string,
  providerReference?: string,
): Promise<DisbursementOutcome> {
  const { error } = await serviceClient.rpc("fail_withdrawal_request", {
    p_provider: gateway.id,
    p_withdrawal_id: withdrawalId,
    p_provider_reference: providerReference ?? null,
    p_failure_reason: reason,
  });

  if (error) {
    console.error(
      `[payouts] Could not mark withdrawal ${withdrawalId} failed:`,
      error.message,
    );
  }

  return { ok: false, result: "failed", error: reason };
}
