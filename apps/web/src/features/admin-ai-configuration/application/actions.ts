"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requirePermission } from "@/lib/rbac/admin-context";
import { throwIfReviewActionError } from "@/lib/admin/review-action";
import { updateAiConfigurationSchema } from "../schemas/ai-configuration.schema";

export async function updateAiConfigurationAction(rawInput: unknown) {
  return createServerAction(
    updateAiConfigurationSchema,
    async (input) => {
      await requirePermission("ai_config.manage");

      const supabase = (await createClient()) as any;
      const { error } = await supabase.rpc("admin_upsert_ai_configuration", {
        p_feature: input.feature,
        p_enabled: input.enabled,
        p_provider: input.provider,
        p_model: input.model,
        p_fallback_provider: input.fallbackProvider ?? null,
        p_fallback_model: input.fallbackModel ?? null,
        p_system_instruction: input.systemInstruction ?? null,
        p_max_tokens: input.maxTokens,
        p_timeout_seconds: input.timeoutSeconds,
        p_temperature: input.temperature ?? null,
        p_moderation_enabled: input.moderationEnabled,
        p_rate_limit_per_minute: input.rateLimitPerMinute ?? null,
        p_daily_usage_limit: input.dailyUsageLimit ?? null,
        p_spending_limit_cents: input.spendingLimitCents ?? null,
        p_reason: input.reason ?? null,
      });

      throwIfReviewActionError(error);

      revalidatePath("/admin/ai-configuration");

      return { feature: input.feature };
    },
    rawInput,
  );
}
