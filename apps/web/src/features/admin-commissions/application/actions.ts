"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requirePermission } from "@/lib/rbac/admin-context";
import { throwIfReviewActionError } from "@/lib/admin/review-action";
import {
  createCommissionRuleSchema,
  updateCommissionRuleSchema,
} from "../schemas/commission-rule.schema";

export async function createCommissionRuleAction(rawInput: unknown) {
  return createServerAction(
    createCommissionRuleSchema,
    async (input) => {
      // Defense-in-depth: admin_create_commission_rule() re-checks the same
      // permission and enforces the real validation (percentage range,
      // scope/reference consistency, min<=max, effective window).
      await requirePermission("commissions.manage");

      const supabase = (await createClient()) as any;
      const { error } = await supabase.rpc("admin_create_commission_rule", {
        p_scope: input.scope,
        p_reference_id: input.referenceId ?? null,
        p_label: input.label ?? null,
        p_percentage: input.percentage ?? null,
        p_flat_fee: input.flatFee ?? null,
        p_min_commission_amount: input.minCommissionAmount ?? null,
        p_max_commission_amount: input.maxCommissionAmount ?? null,
        p_effective_from: input.effectiveFrom,
        p_effective_to: input.effectiveTo ?? null,
      });

      throwIfReviewActionError(error);

      revalidatePath("/admin/commissions");

      return { success: true };
    },
    rawInput,
  );
}

export async function updateCommissionRuleAction(rawInput: unknown) {
  return createServerAction(
    updateCommissionRuleSchema,
    async (input) => {
      // Editing an existing rule requires the higher commissions.override
      // permission — admin_update_commission_rule() re-checks this itself.
      await requirePermission("commissions.override");

      const supabase = (await createClient()) as any;
      const { error } = await supabase.rpc("admin_update_commission_rule", {
        p_rule_id: input.id,
        p_label: input.label ?? null,
        p_percentage: input.percentage ?? null,
        p_flat_fee: input.flatFee ?? null,
        p_min_commission_amount: input.minCommissionAmount ?? null,
        p_max_commission_amount: input.maxCommissionAmount ?? null,
        p_effective_from: input.effectiveFrom,
        p_effective_to: input.effectiveTo ?? null,
        p_is_active: input.isActive,
        p_reason: input.reason,
      });

      throwIfReviewActionError(error);

      revalidatePath("/admin/commissions");

      return { success: true };
    },
    rawInput,
  );
}
