"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import { ValidationError } from "@/src/lib/errors";
import { requirePermission } from "@/lib/rbac/admin-context";
import { createServiceClient } from "@/src/lib/supabase/service";
import { createPayMongoTreasuryAdapter } from "../infrastructure/paymongo/paymongo-treasury.adapter";
import { dispatchWithdrawal } from "./disbursement.service";
import type { WithdrawalRequestRow } from "../types/payout.types";

/**
 * Admin review of withdrawals.
 *
 * Approval is a deliberate gate between a recipient asking for money and
 * the money leaving. `requirePermission` here is defence in depth — every
 * RPC below independently re-checks `is_admin()` inside the database, so
 * a caller who bypassed this layer still cannot approve anything.
 */

const reviewSchema = z.object({
  withdrawalId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

const rejectSchema = z.object({
  withdrawalId: z.string().uuid(),
  note: z.string().trim().min(3, "A reason is required").max(500),
});

const verifyAccountSchema = z.object({
  payoutAccountId: z.string().uuid(),
  reference: z.string().trim().max(160).optional(),
});

function revalidateAdmin() {
  revalidatePath("/admin/withdrawals");
  revalidatePath("/dashboard/earnings");
  revalidatePath("/dashboard/supplier/earnings");
}

export async function approveWithdrawalAction(rawInput: unknown) {
  return createServerAction(
    reviewSchema,
    async (input) => {
      await requirePermission("commissions.manage");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = (await createClient()) as any;
      const { data, error } = await supabase.rpc("approve_withdrawal_request", {
        p_request_id: input.withdrawalId,
        p_note: input.note ?? null,
      });

      if (error) throw new ValidationError(error.message);

      revalidateAdmin();
      return data as WithdrawalRequestRow;
    },
    rawInput,
  );
}

export async function rejectWithdrawalAction(rawInput: unknown) {
  return createServerAction(
    rejectSchema,
    async (input) => {
      await requirePermission("commissions.manage");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = (await createClient()) as any;
      const { data, error } = await supabase.rpc("reject_withdrawal_request", {
        p_request_id: input.withdrawalId,
        p_note: input.note,
      });

      if (error) throw new ValidationError(error.message);

      revalidateAdmin();
      return data as WithdrawalRequestRow;
    },
    rawInput,
  );
}

export async function verifyPayoutAccountAction(rawInput: unknown) {
  return createServerAction(
    verifyAccountSchema,
    async (input) => {
      await requirePermission("commissions.manage");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = (await createClient()) as any;
      const { data, error } = await supabase.rpc("verify_payout_account", {
        p_account_id: input.payoutAccountId,
        p_reference: input.reference ?? null,
      });

      if (error) throw new ValidationError(error.message);

      revalidateAdmin();
      return data;
    },
    rawInput,
  );
}

/**
 * Sends an approved withdrawal to the provider.
 *
 * Separate from approval on purpose: approving is a judgement call, and
 * dispatching is an operation that can fail on the provider's side. Split
 * this way, a failed send can be retried without re-approving, and the
 * approval decision is recorded even if the provider is down.
 *
 * The service-role client is required — it is the only role that can read
 * the encrypted account identifier and call the disbursement RPCs.
 */
export async function dispatchWithdrawalAction(rawInput: unknown) {
  return createServerAction(
    z.object({ withdrawalId: z.string().uuid() }),
    async (input) => {
      await requirePermission("commissions.manage");

      const outcome = await dispatchWithdrawal(
        createServiceClient(),
        createPayMongoTreasuryAdapter(),
        input.withdrawalId,
      );

      // needs_review is not something the admin can fix by retrying: the
      // outcome is genuinely unknown and the funds stay held until someone
      // confirms with the provider.
      if (!outcome.ok && outcome.result === "needs_review") {
        revalidateAdmin();
        throw new ValidationError(
          `${outcome.error} This payout is held for manual review — do not retry it until the outcome is confirmed with PayMongo.`,
        );
      }

      if (!outcome.ok) throw new ValidationError(outcome.error);

      revalidateAdmin();
      return outcome;
    },
    rawInput,
  );
}
