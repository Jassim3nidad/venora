"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requirePermission } from "@/lib/rbac/admin-context";
import type { AdminPermission } from "@/lib/rbac/permissions";
import { createReviewActionSchema, throwIfReviewActionError } from "@/lib/admin/review-action";
import { SUPPLIER_REVIEW_ACTIONS, type SupplierReviewAction } from "../types/supplier-review-action.types";

const SUPPLIER_ACTION_PERMISSIONS: Record<SupplierReviewAction, AdminPermission> = {
  begin_review: "suppliers.review",
  request_info: "suppliers.review",
  note: "suppliers.review",
  approve: "suppliers.approve",
  reject: "suppliers.reject",
  suspend: "suppliers.suspend",
  restore: "suppliers.suspend",
};

const reviewSupplierSchema = createReviewActionSchema(SUPPLIER_REVIEW_ACTIONS);

export async function reviewSupplierAction(rawInput: unknown) {
  return createServerAction(reviewSupplierSchema, async (input) => {
    // Defense-in-depth: admin_review_supplier() re-checks the same
    // permission and is the real authority.
    await requirePermission(SUPPLIER_ACTION_PERMISSIONS[input.action]);

    const supabase = (await createClient()) as any;
    const { data, error } = await supabase.rpc("admin_review_supplier", {
      p_supplier_id: input.id,
      p_action: input.action,
      p_reason: input.reason ?? null,
    });

    throwIfReviewActionError(error);

    revalidatePath("/admin/suppliers");
    revalidatePath(`/admin/suppliers/${input.id}`);

    return { id: input.id, status: data?.accreditation_status as string };
  }, rawInput);
}
