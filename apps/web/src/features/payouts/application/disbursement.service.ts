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
import {
  newCorrelationId,
  payoutLog,
  type PayoutLogContext,
} from "./payout-logger";

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
  | { ok: false; result: "failed" | "needs_review"; error: string };

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

/** One stable string per withdrawal — also the duplicate-detection key. */
function transferDescription(withdrawalId: string): string {
  return `Venora payout ${withdrawalId}`;
}

function toAccountNetwork(value: string | null): TransferNetwork | null {
  return value === "instapay" || value === "pesonet" ? value : null;
}

export async function dispatchWithdrawal(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  withdrawalId: string,
): Promise<DisbursementOutcome> {
  const log: PayoutLogContext = {
    correlationId: newCorrelationId(),
    withdrawalId,
  };

  // Claim first: flips approved -> processing and only succeeds once. The
  // RPC also refuses any withdrawal that already carries a transfer id, so
  // duplicate creation is prevented in the database, not here.
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
      log,
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
      log,
    );
  }

  if (!account.institution_code) {
    return failWithdrawal(
      serviceClient,
      gateway,
      withdrawalId,
      "Payout account has no institution code. It must be re-entered with a supported institution.",
      log,
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
      log,
    );
  }

  const description = transferDescription(withdrawal.id);

  // Read before write. PayMongo documents no idempotency key, so the only
  // way to stop a retry creating a second transfer is to ask whether one
  // already exists for this withdrawal. A lookup failure is not fatal --
  // the claim in begin_withdrawal_disbursement() is still the primary
  // guard -- so it degrades to proceeding rather than blocking a payout.
  try {
    const existing = await gateway.findTransferByReference(
      withdrawal.id,
      description,
    );
    if (existing) {
      payoutLog(
        "warn",
        { ...log, transferId: existing.transferId },
        "transfer.duplicate_adopted",
      );
      await serviceClient.rpc("attach_withdrawal_transfer", {
        p_request_id: withdrawal.id,
        p_provider: gateway.id,
        p_transfer_id: existing.transferId,
        p_batch_transfer_id: existing.batchTransferId,
        p_provider_reference_number: existing.providerReferenceNumber,
      });
      return applyTransferStatus(
        serviceClient,
        gateway,
        withdrawal.id,
        existing,
        log,
      );
    }
  } catch (error) {
    payoutLog("warn", log, "transfer.duplicate_check_failed", {
      detail: error instanceof Error ? error.message : String(error),
    });
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
      description,
      metadata: { withdrawal_id: withdrawal.id, network_reason: networkReason },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Disbursement failed";
    const code = error instanceof PaymentError ? error.code : "unknown";

    payoutLog("error", log, "transfer.create_failed", { code, message });

    // The create call failed, but that does NOT tell us whether a transfer
    // was created -- PayMongo publishes no error taxonomy, so neither the
    // HTTP status nor the message can be read as "nothing happened".
    // Ask the provider instead. Only a confirmed absence releases funds.
    return await resolveAfterUncertainCreate(
      serviceClient,
      gateway,
      withdrawal.id,
      description,
      message,
      log,
    );
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

  return applyTransferStatus(
    serviceClient,
    gateway,
    withdrawal.id,
    transfer,
    log,
  );
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
  parentLog?: PayoutLogContext,
): Promise<DisbursementOutcome> {
  const log: PayoutLogContext = parentLog ?? {
    correlationId: newCorrelationId(),
    withdrawalId,
  };

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
    payoutLog("error", log, "withdrawal.lookup_failed", {
      detail: error?.message ?? "not found",
    });
    return {
      ok: false,
      result: "failed",
      error: error?.message ?? "Withdrawal not found",
    };
  }

  // Terminal states were reached from verified data and are never revisited.
  if (data.status === "paid" || data.status === "failed") {
    return { ok: true, result: "settled" };
  }

  // needs_review is terminal for automation: only an operator moves it on.
  if (data.status === "needs_review") {
    return {
      ok: false,
      result: "needs_review",
      error: "Awaiting operator review",
    };
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
    payoutLog(
      "error",
      { ...log, transferId: data.provider_reference },
      "transfer.status_lookup_failed",
      { detail: message },
    );
    // We hold a transfer id but cannot read its state. Neither terminal
    // state is justified, so this is an operator's call.
    return flagForReview(
      serviceClient,
      gateway,
      data.id,
      `A transfer exists but its status could not be read from the provider: ${message}`,
      data.provider_reference,
      log,
    );
  }

  return applyTransferStatus(serviceClient, gateway, data.id, transfer, log);
}

/**
 * Determines what actually happened after a create call failed.
 *
 * This is the only place allowed to release funds after a failure, and it
 * may only do so on a positive statement from the provider that no
 * transfer exists. Three deterministic outcomes:
 *
 *   transfer found            -> adopt it and apply its real status
 *   confirmed absent          -> fail, release the claimed payouts
 *   cannot determine          -> needs_review, funds stay held
 */
async function resolveAfterUncertainCreate(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  withdrawalId: string,
  description: string,
  originalError: string,
  log: PayoutLogContext,
): Promise<DisbursementOutcome> {
  let existing: TransferResult | null;
  try {
    existing = await gateway.findTransferByReference(withdrawalId, description);
  } catch (lookupError) {
    const detail =
      lookupError instanceof Error ? lookupError.message : "lookup failed";
    payoutLog("error", log, "transfer.confirmation_failed", { detail });
    return flagForReview(
      serviceClient,
      gateway,
      withdrawalId,
      `${originalError} — and we could not confirm with the provider whether a transfer was created (${detail}). Funds are held pending manual verification.`,
      null,
      log,
    );
  }

  if (existing) {
    payoutLog(
      "warn",
      { ...log, transferId: existing.transferId },
      "transfer.recovered_after_failure",
    );
    await serviceClient.rpc("attach_withdrawal_transfer", {
      p_request_id: withdrawalId,
      p_provider: gateway.id,
      p_transfer_id: existing.transferId,
      p_batch_transfer_id: existing.batchTransferId,
      p_provider_reference_number: existing.providerReferenceNumber,
    });
    return applyTransferStatus(
      serviceClient,
      gateway,
      withdrawalId,
      existing,
      log,
    );
  }

  // Verified: the provider has no transfer for this withdrawal, so no
  // money moved and releasing the payouts is safe.
  payoutLog("info", log, "transfer.confirmed_absent");
  return failWithdrawal(
    serviceClient,
    gateway,
    withdrawalId,
    originalError,
    log,
  );
}

/** Parks a withdrawal for an operator. Never releases the claimed payouts. */
async function flagForReview(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  withdrawalId: string,
  reason: string,
  transferId: string | null,
  log: PayoutLogContext,
): Promise<DisbursementOutcome> {
  const { error } = await serviceClient.rpc("flag_withdrawal_for_review", {
    p_withdrawal_id: withdrawalId,
    p_provider: gateway.id,
    p_reason: reason,
    p_transfer_id: transferId,
  });

  if (error) {
    payoutLog("error", log, "review.flag_failed", { detail: error.message });
  } else {
    payoutLog("warn", log, "withdrawal.needs_review", { reason });
  }

  return { ok: false, result: "needs_review", error: reason };
}

/**
 * Resolves every withdrawal stuck in `processing`.
 *
 * Two distinct cases:
 *
 *   with a transfer id     — re-read authoritative status.
 *   without a transfer id  — the create call was ambiguous (timeout, 5xx).
 *                            Ask the provider whether a transfer exists for
 *                            this withdrawal before deciding anything.
 *
 * The second case is the whole reason ambiguous failures do not release
 * funds: only the provider can say whether the money moved.
 */
export async function reconcileStuckWithdrawals(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  limit = 50,
): Promise<{
  checked: number;
  settled: number;
  failed: number;
  pending: number;
}> {
  const { data } = await serviceClient
    .from("withdrawal_requests")
    .select("id, provider_reference")
    .eq("status", "processing")
    .order("requested_at", { ascending: true })
    .limit(limit);

  const rows = (data ?? []) as Array<{
    id: string;
    provider_reference: string | null;
  }>;

  const tally = {
    checked: rows.length,
    settled: 0,
    failed: 0,
    pending: 0,
    needsReview: 0,
  };

  for (const row of rows) {
    const log: PayoutLogContext = {
      correlationId: newCorrelationId(),
      withdrawalId: row.id,
      transferId: row.provider_reference,
    };

    try {
      let outcome: DisbursementOutcome;

      if (row.provider_reference) {
        outcome = await syncWithdrawalStatus(
          serviceClient,
          gateway,
          row.id,
          log,
        );
      } else {
        const existing = await gateway.findTransferByReference(
          row.id,
          transferDescription(row.id),
        );

        if (!existing) {
          // No transfer was ever created, so no money moved. Safe to
          // release — and only safe because the provider confirmed it.
          outcome = await failWithdrawal(
            serviceClient,
            gateway,
            row.id,
            "No transfer was created at the provider; the payout was not sent.",
            log,
          );
        } else {
          await serviceClient.rpc("attach_withdrawal_transfer", {
            p_request_id: row.id,
            p_provider: gateway.id,
            p_transfer_id: existing.transferId,
            p_batch_transfer_id: existing.batchTransferId,
            p_provider_reference_number: existing.providerReferenceNumber,
          });
          outcome = await applyTransferStatus(
            serviceClient,
            gateway,
            row.id,
            existing,
            log,
          );
        }
      }

      if (outcome.ok && outcome.result === "settled") tally.settled += 1;
      else if (!outcome.ok && outcome.result === "failed") tally.failed += 1;
      else if (!outcome.ok && outcome.result === "needs_review")
        tally.needsReview += 1;
      else tally.pending += 1;
    } catch (error) {
      // One unreachable withdrawal must not stop the sweep -- but it also
      // must not be left silently in flight, so it is escalated.
      const detail = error instanceof Error ? error.message : String(error);
      payoutLog("error", log, "reconcile.failed", { detail });
      await flagForReview(
        serviceClient,
        gateway,
        row.id,
        `Reconciliation could not determine this withdrawal's outcome: ${detail}`,
        row.provider_reference,
        log,
      );
      tally.needsReview += 1;
    }
  }

  return tally;
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
  log: PayoutLogContext,
): Promise<DisbursementOutcome> {
  const scoped = { ...log, transferId: transfer.transferId };
  payoutLog("info", scoped, "transfer.status", { status: transfer.status });

  if (transfer.status === "succeeded") {
    const { error } = await serviceClient.rpc("settle_withdrawal_request", {
      p_provider: gateway.id,
      p_withdrawal_id: withdrawalId,
      p_provider_reference: transfer.transferId,
    });
    if (error) {
      // The transfer succeeded but we could not record it. Releasing or
      // retrying would both be wrong; an operator must reconcile.
      return flagForReview(
        serviceClient,
        gateway,
        withdrawalId,
        `Provider reported the transfer succeeded but the settlement could not be recorded: ${error.message}`,
        transfer.transferId,
        scoped,
      );
    }
    return { ok: true, result: "settled" };
  }

  if (transfer.status === "failed") {
    return failWithdrawal(
      serviceClient,
      gateway,
      withdrawalId,
      "The payout provider reported the transfer as failed.",
      scoped,
      transfer.transferId,
    );
  }

  if (transfer.status === "unknown") {
    // An undocumented status value. Coercing it to pending or failed would
    // assert behaviour PayMongo has not published.
    return flagForReview(
      serviceClient,
      gateway,
      withdrawalId,
      "The payout provider returned a transfer status outside the documented set. Manual verification required.",
      transfer.transferId,
      scoped,
    );
  }

  return { ok: true, result: "sent" };
}

/**
 * Marks the withdrawal failed, releasing its payouts back to available.
 *
 * Only ever called when it is established that no money moved.
 */
async function failWithdrawal(
  serviceClient: SupabaseClient,
  gateway: DisbursementGateway,
  withdrawalId: string,
  reason: string,
  log: PayoutLogContext,
  providerReference?: string,
): Promise<DisbursementOutcome> {
  const { error } = await serviceClient.rpc("fail_withdrawal_request", {
    p_provider: gateway.id,
    p_withdrawal_id: withdrawalId,
    p_provider_reference: providerReference ?? null,
    p_failure_reason: reason,
  });

  if (error) {
    payoutLog("error", log, "withdrawal.fail_failed", {
      detail: error.message,
    });
    return flagForReview(
      serviceClient,
      gateway,
      withdrawalId,
      `The payout did not go through, but the failure could not be recorded: ${error.message}`,
      providerReference ?? null,
      log,
    );
  }

  payoutLog("warn", log, "withdrawal.failed", { reason });
  return { ok: false, result: "failed", error: reason };
}
