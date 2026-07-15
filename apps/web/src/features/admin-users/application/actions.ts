"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requirePermission } from "@/lib/rbac/admin-context";
import { throwIfReviewActionError } from "@/lib/admin/review-action";
import { setAccountStatusSchema } from "../schemas/account-status.schema";

const NEW_STATUS_FOR_ACTION = {
  suspend: "suspended",
  reactivate: "active",
} as const;

export async function setAccountStatusAction(rawInput: unknown) {
  return createServerAction(
    setAccountStatusSchema,
    async (input) => {
      // Defense-in-depth: admin_set_account_status() re-checks the same
      // permission and additionally enforces self-protection (can't suspend
      // your own account) and the last-active-super-admin guard.
      await requirePermission(
        input.action === "suspend" ? "users.suspend" : "users.reactivate",
      );

      const supabase = (await createClient()) as any;
      const { data, error } = await supabase.rpc("admin_set_account_status", {
        p_profile_id: input.id,
        p_new_status: NEW_STATUS_FOR_ACTION[input.action],
        p_reason: input.reason ?? null,
      });

      throwIfReviewActionError(error);

      revalidatePath("/admin/users");
      revalidatePath(`/admin/users/${input.id}`);

      return { id: input.id, status: data?.status as string };
    },
    rawInput,
  );
}
