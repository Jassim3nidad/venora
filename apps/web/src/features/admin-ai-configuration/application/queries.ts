import { createClient } from "@/lib/supabase/server";
import type { AiConfiguration, AiFeature, AiUsageSummary } from "../types/ai-configuration.types";
import { AI_FEATURES } from "../types/ai-configuration.types";

export async function getAiConfigurations(): Promise<{
  configurations: AiConfiguration[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("ai_configurations")
    .select(
      "feature, enabled, provider, model, fallback_provider, fallback_model, system_instruction, max_tokens, timeout_seconds, temperature, moderation_enabled, rate_limit_per_minute, daily_usage_limit, spending_limit_cents, updated_at, profiles:updated_by (full_name)",
    );

  if (error) return { configurations: null, error: error.message };

  const byFeature = new Map((data ?? []).map((row: any) => [row.feature, row]));

  const configurations: AiConfiguration[] = AI_FEATURES.map((feature) => {
    const row = byFeature.get(feature) as any;
    return {
      feature,
      enabled: row?.enabled ?? false,
      provider: row?.provider ?? "openrouter",
      model: row?.model ?? "",
      fallbackProvider: row?.fallback_provider ?? null,
      fallbackModel: row?.fallback_model ?? null,
      systemInstruction: row?.system_instruction ?? null,
      maxTokens: row?.max_tokens ?? 1024,
      timeoutSeconds: row?.timeout_seconds ?? 30,
      temperature: row?.temperature !== undefined && row?.temperature !== null ? Number(row.temperature) : null,
      moderationEnabled: row?.moderation_enabled ?? true,
      rateLimitPerMinute: row?.rate_limit_per_minute ?? null,
      dailyUsageLimit: row?.daily_usage_limit ?? null,
      spendingLimitCents: row?.spending_limit_cents ?? null,
      updatedByName: row?.profiles?.full_name ?? null,
      updatedAt: row?.updated_at ?? "",
    };
  });

  return { configurations, error: null };
}

/**
 * Always returns zero rows today — ai_usage_logs has no writer yet (the
 * ai-* Edge Functions aren't instrumented). Kept as a real query (not
 * fabricated data) so the page's empty state is honest and this becomes a
 * one-line change once logging is wired up.
 */
export async function getAiUsageSummary(): Promise<AiUsageSummary[]> {
  const supabase = (await createClient()) as any;

  const { data } = await supabase
    .from("ai_usage_logs")
    .select("feature, success, input_tokens, output_tokens, estimated_cost_cents")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const byFeature = new Map<AiFeature, AiUsageSummary>();
  for (const row of (data ?? []) as any[]) {
    const existing = byFeature.get(row.feature) ?? {
      feature: row.feature,
      requestCount: 0,
      failureCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      estimatedCostCents: 0,
    };
    existing.requestCount += 1;
    if (!row.success) existing.failureCount += 1;
    existing.totalInputTokens += row.input_tokens ?? 0;
    existing.totalOutputTokens += row.output_tokens ?? 0;
    existing.estimatedCostCents += row.estimated_cost_cents ?? 0;
    byFeature.set(row.feature, existing);
  }

  return Array.from(byFeature.values());
}
