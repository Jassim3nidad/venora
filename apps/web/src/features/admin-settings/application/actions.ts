"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requirePermission } from "@/lib/rbac/admin-context";
import { ValidationError } from "@/lib/errors";
import { throwIfReviewActionError } from "@/lib/admin/review-action";
import { updateSystemSettingSchema } from "../schemas/system-setting.schema";
import { SETTING_DEFINITIONS } from "../types/system-setting.types";

export async function updateSystemSettingAction(rawInput: unknown) {
  return createServerAction(updateSystemSettingSchema, async (input) => {
    await requirePermission("system_settings.manage");

    const definition = SETTING_DEFINITIONS.find((d) => d.key === input.key);
    if (!definition) throw new ValidationError(`Unknown setting: ${input.key}`);

    const actualType = Array.isArray(input.value) ? "string[]" : typeof input.value;
    const expectedType = definition.valueType === "string[]" ? "string[]" : definition.valueType;
    if (actualType !== expectedType) {
      throw new ValidationError(`"${definition.label}" expects a ${definition.valueType} value`);
    }

    if (definition.isDangerous && !input.reason?.trim()) {
      throw new ValidationError(`A reason is required to change "${definition.label}"`);
    }

    const supabase = (await createClient()) as any;
    const { error } = await supabase.rpc("admin_update_system_setting", {
      p_key: input.key,
      p_value: input.value,
      p_reason: input.reason ?? null,
    });

    throwIfReviewActionError(error);

    revalidatePath("/admin/settings");

    return { key: input.key };
  }, rawInput);
}
