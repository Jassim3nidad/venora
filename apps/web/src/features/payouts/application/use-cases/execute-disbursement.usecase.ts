import type { SupabaseClient } from "@supabase/supabase-js";
import { toMinorUnits } from "@/features/payments/domain/value-objects/money.vo";
import type { PaymentGateway } from "@/features/payments/domain/gateways/payment-gateway.port";
import { decryptAccountIdentifier } from "../payout-encryption";
import type { PayoutMethod } from "../../types/payout.types";

export type DisbursementOutcome =
  | { ok: true; result: "sent" | "settled" | "not_claimable" }
  | { ok: false; result: "failed"; error: string };

interface PayoutAccountSecret {
  method: PayoutMethod;
  account_name: string;
  bank_name: string | null;
  account_identifier_ciphertext: string;
  verified_at: string | null;
  archived_at: string | null;
}

/**
 * Sends one approved withdrawal to the provider.
 *
 * Runs on the service-role client: it is the only role with SELECT on
 * payout_accounts.account_identifier_ciphertext, and the disbursement
 * lifecycle RPCs are service_role-only by grant.
 *
 * Ordering is deliberate. begin_withdrawal_disbursement() flips the
 * withdrawal to `processing` BEFORE the provider is called, and only
 * succeeds from `approved`. A concurrent or retried run therefore finds
 * nothing to claim and returns `not_claimable` instead of issuing a
 * second payout for the same money. The cost is that a crash between the
 * claim and the provider call leaves the withdrawal in `processing` with
 * no provider reference — recoverable by an operator, whereas a double
 * disbursement is not.
 */
export async function executeDisbursement(
  serviceClient: SupabaseClient,
  gateway: PaymentGateway,
  withdrawalId: string,
): Promise<DisbursementOutcome> {
  const { data: claimed, error: claimError } = await serviceClient.rpc(
    "begin_withdrawal_disbursement",
    { p_request_id: withdrawalId, p_provider: gateway.id },
  );

  if (claimError) {
    return { ok: false, result: "failed", error: claimError.message };
  }

  // Already processing, already paid, or never approved.
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
      "method, account_name, bank_name, account_identifier_ciphertext, verified_at, archived_at",
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
  // archived or have its verification reset (by editing the underlying
  // number) between the request and the disbursement.
  if (!account.verified_at || account.archived_at) {
    return failWithdrawal(
      serviceClient,
      gateway,
      withdrawalId,
      "Payout account is no longer verified",
    );
  }

  try {
    // Plaintext exists only inside this call's stack, and is never
    // logged, returned, or attached to an error.
    const accountIdentifier = decryptAccountIdentifier(
      account.account_identifier_ciphertext,
    );

    const disbursement = await gateway.createDisbursement({
      withdrawalId: withdrawal.id,
      amountMinor: toMinorUnits(Number(withdrawal.amount)),
      currency: withdrawal.currency,
      method: account.method,
      accountIdentifier,
      accountName: account.account_name,
      bankName: account.bank_name,
      description: `Venora payout ${withdrawal.id}`,
      metadata: { withdrawal_id: withdrawal.id },
    });

    await serviceClient.rpc("attach_withdrawal_provider_reference", {
      p_request_id: withdrawal.id,
      p_provider: gateway.id,
      p_provider_reference: disbursement.disbursementReference,
    });

    // Providers that settle synchronously will not send a webhook, so
    // close the loop here. `settle_withdrawal_request` no-ops on a
    // withdrawal that is already paid, so a later webhook is harmless.
    if (disbursement.status === "succeeded") {
      const { error } = await serviceClient.rpc("settle_withdrawal_request", {
        p_provider: gateway.id,
        p_withdrawal_id: withdrawal.id,
        p_provider_reference: disbursement.disbursementReference,
      });
      if (error) return { ok: false, result: "failed", error: error.message };
      return { ok: true, result: "settled" };
    }

    if (disbursement.status === "failed") {
      return failWithdrawal(
        serviceClient,
        gateway,
        withdrawal.id,
        "Provider rejected the payout",
        disbursement.disbursementReference,
      );
    }

    return { ok: true, result: "sent" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Disbursement failed";
    console.error(`[payouts] Disbursement ${withdrawalId} failed:`, message);
    return failWithdrawal(serviceClient, gateway, withdrawalId, message);
  }
}

/**
 * Marks the withdrawal failed, which releases its claimed payouts back to
 * the recipient's available balance.
 */
async function failWithdrawal(
  serviceClient: SupabaseClient,
  gateway: PaymentGateway,
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
