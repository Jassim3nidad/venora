/**
 * Shared AI runtime configuration loader/enforcer for the ai-* Edge
 * Functions. Reads the admin-controlled `ai_configurations` table
 * (migration 058/060) and enforces it — this is what makes the admin AI
 * Configuration page actually control runtime behavior, rather than just
 * recording an intent that the functions ignore.
 *
 * Nothing here ever touches provider API keys — those stay exactly where
 * they were (Deno.env.get(...) in each function). This module only reads
 * non-secret config (enabled/provider/model/limits) and writes usage
 * metadata (never prompt content, per ai_usage_logs' own table comment).
 */

export type AiFeature =
  | "assistant"
  | "search"
  | "recommendation"
  | "venue_description"
  | "cost_estimator"
  | "package_comparison"
  | "embeddings";

export type AiConfiguration = {
  feature: AiFeature;
  enabled: boolean;
  provider: string;
  model: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  systemInstruction: string | null;
  maxTokens: number;
  timeoutSeconds: number;
  temperature: number | null;
  moderationEnabled: boolean;
  rateLimitPerMinute: number | null;
  dailyUsageLimit: number | null;
  spendingLimitCents: number | null;
};

export type SupabaseLike = {
  from: (table: string) => any;
};

const SUPPORTED_PROVIDERS = ["openrouter", "openai"];

/**
 * Loads the stored config for a feature via the service-role client
 * (ai_configurations has no RLS policy for anon/authenticated — by
 * design, only admins read it through the app; Edge Functions read it
 * with the service-role key, same as every other table they touch).
 * Returns null if the row is missing (shouldn't happen post-060, but
 * callers must fail closed rather than assume defaults on a missing row).
 */
export async function loadAiConfig(
  supabase: SupabaseLike,
  feature: AiFeature,
): Promise<AiConfiguration | null> {
  const { data, error } = await supabase
    .from("ai_configurations")
    .select(
      "feature, enabled, provider, model, fallback_provider, fallback_model, system_instruction, max_tokens, timeout_seconds, temperature, moderation_enabled, rate_limit_per_minute, daily_usage_limit, spending_limit_cents",
    )
    .eq("feature", feature)
    .maybeSingle();

  if (error || !data) return null;

  return {
    feature: data.feature,
    enabled: data.enabled,
    provider: data.provider,
    model: data.model,
    fallbackProvider: data.fallback_provider,
    fallbackModel: data.fallback_model,
    systemInstruction: data.system_instruction,
    maxTokens: data.max_tokens,
    timeoutSeconds: data.timeout_seconds,
    temperature: data.temperature !== null ? Number(data.temperature) : null,
    moderationEnabled: data.moderation_enabled,
    rateLimitPerMinute: data.rate_limit_per_minute,
    dailyUsageLimit: data.daily_usage_limit,
    spendingLimitCents: data.spending_limit_cents,
  };
}

export function validateProviderModel(config: AiConfiguration): { ok: boolean; reason?: string } {
  if (!SUPPORTED_PROVIDERS.includes(config.provider)) {
    return { ok: false, reason: `Unsupported AI provider "${config.provider}"` };
  }
  if (!config.model || config.model.trim() === "") {
    return { ok: false, reason: "No model configured for this feature" };
  }
  return { ok: true };
}

/**
 * Rate/usage/spend checks against ai_usage_logs. Each check is skipped
 * when its limit is null (no limit configured) — this is what makes every
 * limit optional/nullable actually behave as "unlimited" rather than
 * silently blocking everything on a fresh install.
 */
export async function checkAiUsageLimits(
  supabase: SupabaseLike,
  feature: AiFeature,
  config: AiConfiguration,
): Promise<{ allowed: boolean; reason?: string }> {
  if (config.rateLimitPerMinute !== null) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("feature", feature)
      .gte("created_at", since);
    if ((count ?? 0) >= config.rateLimitPerMinute) {
      return { allowed: false, reason: "This AI feature is receiving too many requests right now. Please try again in a minute." };
    }
  }

  if (config.dailyUsageLimit !== null) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("feature", feature)
      .gte("created_at", startOfDay.toISOString());
    if ((count ?? 0) >= config.dailyUsageLimit) {
      return { allowed: false, reason: "This AI feature has reached its daily usage limit. Please try again tomorrow." };
    }
  }

  if (config.spendingLimitCents !== null) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("ai_usage_logs")
      .select("estimated_cost_cents")
      .eq("feature", feature)
      .gte("created_at", startOfDay.toISOString());
    const spent = ((data ?? []) as { estimated_cost_cents: number | null }[]).reduce(
      (sum, row) => sum + (row.estimated_cost_cents ?? 0),
      0,
    );
    if (spent >= config.spendingLimitCents) {
      return { allowed: false, reason: "This AI feature has reached its daily spending limit. Please try again tomorrow." };
    }
  }

  return { allowed: true };
}

/**
 * Best-effort budgeting estimate, not a billing reconciliation source —
 * matches the "estimated_cost" naming already in the schema. Unknown
 * models default to 0 rather than guessing, so a genuinely free model
 * (the seeded default, tencent/hy3:free) never shows a fabricated cost.
 */
const COST_PER_1K_TOKENS_CENTS: Record<string, number> = {
  "tencent/hy3:free": 0,
  "text-embedding-3-small": 0.002,
};

export function estimateCostCents(model: string, totalTokens: number): number {
  const rate = COST_PER_1K_TOKENS_CENTS[model] ?? 0;
  return Math.round(((totalTokens / 1000) * rate) * 100) / 100;
}

export type LogAiUsageEntry = {
  feature: AiFeature;
  provider: string;
  model: string;
  actorId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostCents?: number | null;
  durationMs?: number | null;
  success: boolean;
  errorCategory?: string | null;
};

/**
 * Writes ai_usage_logs. Deliberately accepts no prompt/response text
 * field at all (not just "doesn't pass one today") — the table itself has
 * no column for it (migration 058), so there is nowhere for prompt
 * content to leak into even by mistake. Logging failure is swallowed
 * (best-effort) so a metrics-write hiccup never breaks the actual AI
 * response the user is waiting on.
 */
export async function logAiUsage(supabase: SupabaseLike, entry: LogAiUsageEntry): Promise<void> {
  try {
    await supabase.from("ai_usage_logs").insert({
      feature: entry.feature,
      provider: entry.provider,
      model: entry.model,
      actor_id: entry.actorId ?? null,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      estimated_cost_cents: entry.estimatedCostCents ?? null,
      duration_ms: entry.durationMs ?? null,
      success: entry.success,
      error_category: entry.errorCategory ?? null,
    });
  } catch (error) {
    console.error("[ai-config] logAiUsage failed (non-fatal):", error);
  }
}

/** Wraps fetch() with the configured per-feature timeout via AbortController. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutSeconds: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Minimal, honest content-safety check for free-text user input (chat
 * messages, search queries) — NOT a replacement for a real moderation
 * API (none is integrated; adding one is a larger, separate change).
 * Blocks the most common prompt-injection phrasing and an empty
 * profanity baseline. Gated behind moderation_enabled so it can be
 * turned off per-feature if it ever produces a false positive.
 */
const BLOCKED_INPUT_PATTERNS = [
  /ignore (all|any|previous|prior) instructions/i,
  /disregard (all|any|previous|prior) (instructions|rules)/i,
  /you are now (in )?(developer|dan|jailbreak) mode/i,
  /reveal (your|the) (system prompt|instructions)/i,
];

export function moderateInputText(text: string): { allowed: boolean; reason?: string } {
  for (const pattern of BLOCKED_INPUT_PATTERNS) {
    if (pattern.test(text)) {
      return { allowed: false, reason: "This request could not be processed. Please rephrase and try again." };
    }
  }
  return { allowed: true };
}

/** Extracts real token counts from an OpenAI/OpenRouter-compatible response body. */
export function extractTokenUsage(body: { usage?: { prompt_tokens?: number; completion_tokens?: number } } | null | undefined): {
  inputTokens: number | null;
  outputTokens: number | null;
} {
  return {
    inputTokens: body?.usage?.prompt_tokens ?? null,
    outputTokens: body?.usage?.completion_tokens ?? null,
  };
}

const PROVIDER_CHAT_COMPLETIONS_URL: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
};

function providerHeaders(provider: string, apiKey: string): Record<string, string> {
  if (provider === "openrouter") {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://venora.app",
      "X-Title": "Venora AI",
    };
  }
  // openai (and any other provider added later that speaks the same
  // OpenAI-compatible wire format) needs no extra attribution headers.
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

export type ProviderApiKeys = {
  openrouter?: string | null;
  openai?: string | null;
};

/**
 * Calls the configured provider's chat-completions endpoint (non-streaming
 * only — see ai-assistant/index.ts for why the streaming path doesn't use
 * this) with the given request body (model/messages/response_format are
 * caller-supplied; this function only decides WHICH provider/URL/key to
 * use). On a non-ok response, retries once against config.fallbackProvider/
 * fallbackModel if both are set and a key is available for that provider —
 * this is the actual "fallback provider" enforcement, not just stored
 * config. Throws if neither the primary nor the fallback succeeds.
 */
export async function postChatCompletion(
  config: AiConfiguration,
  apiKeys: ProviderApiKeys,
  body: Record<string, unknown>,
): Promise<{ response: Response; providerUsed: string; modelUsed: string; usedFallback: boolean }> {
  const primaryKey = apiKeys[config.provider as keyof ProviderApiKeys];
  const primaryUrl = PROVIDER_CHAT_COMPLETIONS_URL[config.provider];

  if (primaryKey && primaryUrl) {
    const response = await fetchWithTimeout(
      primaryUrl,
      {
        method: "POST",
        headers: providerHeaders(config.provider, primaryKey),
        body: JSON.stringify({ ...body, model: config.model }),
      },
      config.timeoutSeconds,
    );
    if (response.ok) {
      return { response, providerUsed: config.provider, modelUsed: config.model, usedFallback: false };
    }
    console.error(`[ai-config] Primary provider "${config.provider}" failed (${response.status}); trying fallback if configured.`);
  }

  if (config.fallbackProvider && config.fallbackModel) {
    const fallbackKey = apiKeys[config.fallbackProvider as keyof ProviderApiKeys];
    const fallbackUrl = PROVIDER_CHAT_COMPLETIONS_URL[config.fallbackProvider];
    if (fallbackKey && fallbackUrl) {
      const response = await fetchWithTimeout(
        fallbackUrl,
        {
          method: "POST",
          headers: providerHeaders(config.fallbackProvider, fallbackKey),
          body: JSON.stringify({ ...body, model: config.fallbackModel }),
        },
        config.timeoutSeconds,
      );
      if (response.ok) {
        return { response, providerUsed: config.fallbackProvider, modelUsed: config.fallbackModel, usedFallback: true };
      }
      throw new Error(`Both primary (${config.provider}) and fallback (${config.fallbackProvider}) providers failed.`);
    }
  }

  throw new Error(`Provider "${config.provider}" request failed and no usable fallback is configured.`);
}
