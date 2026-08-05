"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import { UnauthorizedError, ValidationError } from "@/src/lib/errors";
import { checkRateLimit } from "@/src/lib/security/rate-limit";
import {
  archivePayoutAccountSchema,
  payoutAccountSchema,
  withdrawalIdSchema,
  withdrawalRequestSchema,
} from "../schemas/payout.schema";
import {
  encryptAccountIdentifier,
  fingerprintAccountIdentifier,
  lastFourDigits,
} from "./payout-encryption";
import type {
  PayoutAccountRow,
  WithdrawalRequestRow,
} from "../types/payout.types";

/**
 * Money-out server actions.
 *
 * Authorization is not implemented here. Every write below lands on
 * either an RLS-protected table (payout_accounts) or a SECURITY DEFINER
 * RPC that re-derives the caller from auth.uid() and re-checks
 * is_org_member/is_supplier_owner. A forged scope id in the input fails
 * at the database, not on trust in this layer.
 */

const EARNINGS_PATHS = [
  "/dashboard/earnings",
  "/dashboard/supplier/earnings",
] as const;

function revalidateEarnings() {
  for (const path of EARNINGS_PATHS) revalidatePath(path);
}

async function requireUser() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthorizedError("Please sign in to continue.");

  return { supabase, user };
}

/**
 * Per-user throttle in front of the database limits.
 *
 * This is a fast rejection for hammering, not the security boundary —
 * it is per-instance and resets on redeploy. request_withdrawal() holds
 * the authoritative limits (one in-flight withdrawal per recipient, five
 * per rolling 24h) where they cannot be bypassed by hitting a different
 * instance.
 */
function throttle(userId: string, action: string, max: number) {
  if (!checkRateLimit(userId, `payouts:${action}`, "POST", max, 60_000)) {
    throw new ValidationError(
      "Too many attempts. Please wait a moment and try again.",
    );
  }
}

export async function addPayoutAccountAction(rawInput: unknown) {
  return createServerAction(
    payoutAccountSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      throttle(user.id, "account", 10);

      // Encrypt before the value can reach the query builder. Only the
      // envelope, the HMAC, and the last four digits are ever sent.
      const ciphertext = encryptAccountIdentifier(input.accountIdentifier);
      const fingerprint = fingerprintAccountIdentifier(input.accountIdentifier);
      const last4 = lastFourDigits(input.accountIdentifier);

      const { data, error } = await supabase
        .from("payout_accounts")
        .insert({
          organization_id:
            input.scope === "organization" ? input.scopeId : null,
          supplier_id: input.scope === "supplier" ? input.scopeId : null,
          method: input.method,
          account_name: input.accountName,
          bank_name: input.bankName ?? null,
          account_number_last4: last4,
          account_identifier_ciphertext: ciphertext,
          account_fingerprint: fingerprint,
          is_default: input.makeDefault,
          created_by: user.id,
        })
        .select(
          "id, organization_id, supplier_id, method, account_name, bank_name, " +
            "account_number_last4, is_default, verified_at, archived_at, created_at",
        )
        .single();

      if (error) {
        // 23505 is the fingerprint uniqueness index — the same
        // destination is already registered for this recipient.
        if (error.code === "23505") {
          throw new ValidationError(
            "That account is already saved for payouts.",
          );
        }
        throw new ValidationError(error.message);
      }

      revalidateEarnings();
      return data as PayoutAccountRow;
    },
    rawInput,
  );
}

export async function archivePayoutAccountAction(rawInput: unknown) {
  return createServerAction(
    archivePayoutAccountSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      throttle(user.id, "account", 10);

      // Archived rather than deleted: a destination that has received
      // money has to stay auditable through a dispute.
      const { error } = await supabase
        .from("payout_accounts")
        .update({ archived_at: new Date().toISOString(), is_default: false })
        .eq("id", input.payoutAccountId);

      if (error) throw new ValidationError(error.message);

      revalidateEarnings();
      return { archived: true };
    },
    rawInput,
  );
}

export async function requestWithdrawalAction(rawInput: unknown) {
  return createServerAction(
    withdrawalRequestSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      throttle(user.id, "withdraw", 5);

      const { data, error } = await supabase.rpc("request_withdrawal", {
        p_amount: input.amount,
        p_payout_account_id: input.payoutAccountId,
        p_idempotency_key: input.idempotencyKey,
      });

      // Every guard in request_withdrawal() (verification, balance,
      // rate limits, permissions) surfaces as a Postgres exception. The
      // messages are written to be shown to the user as-is.
      if (error) throw new ValidationError(error.message);

      revalidateEarnings();
      return data as WithdrawalRequestRow;
    },
    rawInput,
  );
}

export async function cancelWithdrawalAction(rawInput: unknown) {
  return createServerAction(
    withdrawalIdSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      throttle(user.id, "withdraw", 5);

      const { data, error } = await supabase.rpc("cancel_withdrawal_request", {
        p_request_id: input.withdrawalId,
      });

      if (error) throw new ValidationError(error.message);

      revalidateEarnings();
      return data as WithdrawalRequestRow;
    },
    rawInput,
  );
}
