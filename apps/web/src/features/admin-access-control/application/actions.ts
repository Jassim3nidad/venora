"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requirePermission } from "@/lib/rbac/admin-context";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { assignAdminTierSchema } from "../schemas/admin-access-control.schema";

function throwIfSupabaseError(
  error: { message?: string } | null | undefined,
): void {
  if (!error) return;
  const normalized = (error.message ?? "").toLowerCase();
  if (
    normalized.includes("permission") ||
    normalized.includes("row-level security")
  ) {
    throw new ForbiddenError(error.message);
  }
  // admin_assign_tier() RAISE EXCEPTION messages (self-modification, last
  // super_admin, target not an admin, etc.) surface here as plain text.
  throw new ValidationError(
    error.message ?? "Could not update the administrator's tier.",
  );
}

export async function assignAdminTierAction(rawInput: unknown) {
  return createServerAction(
    assignAdminTierSchema,
    async (input) => {
      // requirePermission() is defense-in-depth here — admin_assign_tier()
      // re-checks admin_roles.manage itself and is the actual authority
      // (it also enforces self-protection / last-super-admin rules that
      // can't be expressed at this layer).
      await requirePermission("admin_roles.manage");

      const supabase = (await createClient()) as any;

      const { data, error } = await supabase.rpc("admin_assign_tier", {
        p_target_user_id: input.userId,
        p_new_tier: input.tier,
        p_reason: input.reason ?? null,
      });

      throwIfSupabaseError(error);

      revalidatePath("/admin/administrators");

      return { userId: input.userId, tier: data?.tier as string };
    },
    rawInput,
  );
}
