"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requirePermission } from "@/lib/rbac/admin-context";
import { throwIfReviewActionError } from "@/lib/admin/review-action";
import {
  createMarketplaceFlagSchema,
  updateMarketplaceFlagSchema,
} from "../schemas/marketplace-flag.schema";

export async function createMarketplaceFlagAction(rawInput: unknown) {
  return createServerAction(
    createMarketplaceFlagSchema,
    async (input) => {
      await requirePermission("marketplace.moderate");

      const supabase = (await createClient()) as any;
      const { error } = await supabase.rpc("admin_create_marketplace_flag", {
        p_entity_type: input.entityType,
        p_entity_id: input.entityId,
        p_flag_type: input.flagType,
        p_severity: input.severity,
        p_notes: input.notes ?? null,
      });

      throwIfReviewActionError(error);

      revalidatePath("/admin/marketplace");

      return { success: true };
    },
    rawInput,
  );
}

export async function updateMarketplaceFlagAction(rawInput: unknown) {
  return createServerAction(
    updateMarketplaceFlagSchema,
    async (input) => {
      await requirePermission("marketplace.moderate");

      const supabase = (await createClient()) as any;
      const { error } = await supabase.rpc("admin_update_marketplace_flag", {
        p_flag_id: input.id,
        p_status: input.status ?? null,
        p_assigned_to: input.assignedTo ?? null,
        p_notes: input.notes ?? null,
        p_reason: input.reason ?? null,
      });

      throwIfReviewActionError(error);

      revalidatePath("/admin/marketplace");

      return { success: true };
    },
    rawInput,
  );
}
