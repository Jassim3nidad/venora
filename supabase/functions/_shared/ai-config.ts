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

export const APPROVED_AI_PROVIDER = "openrouter";
export const APPROVED_AI_MODEL = "qwen/qwen3.7-flash";

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

export function validateProviderModel(config: AiConfiguration): {
  ok: boolean;
  reason?: string;
} {
  if (config.provider !== APPROVED_AI_PROVIDER) {
    return {
      ok: false,
      reason: `AI provider must be "${APPROVED_AI_PROVIDER}"`,
    };
  }
  if (config.model !== APPROVED_AI_MODEL) {
    return {
      ok: false,
      reason: `AI model must be "${APPROVED_AI_MODEL}"`,
    };
  }
  if (config.fallbackProvider || config.fallbackModel) {
    return { ok: false, reason: "Fallback AI providers are not supported" };
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
      return {
        allowed: false,
        reason:
          "This AI feature is receiving too many requests right now. Please try again in a minute.",
      };
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
      return {
        allowed: false,
        reason:
          "This AI feature has reached its daily usage limit. Please try again tomorrow.",
      };
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
    const spent = (
      (data ?? []) as { estimated_cost_cents: number | null }[]
    ).reduce((sum, row) => sum + (row.estimated_cost_cents ?? 0), 0);
    if (spent >= config.spendingLimitCents) {
      return {
        allowed: false,
        reason:
          "This AI feature has reached its daily spending limit. Please try again tomorrow.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Best-effort budgeting estimate, not a billing reconciliation source —
 * matches the "estimated_cost" naming already in the schema. Unknown
 * models default to 0 rather than guessing. Qwen 3.7 Flash uses its maximum
 * published input/output rate because this helper receives only a total token
 * count; the estimate is intentionally conservative.
 */
const COST_PER_1K_TOKENS_CENTS: Record<string, number> = {
  "qwen/qwen3.7-flash": 0.013,
};

export function estimateCostCents(model: string, totalTokens: number): number {
  const rate = COST_PER_1K_TOKENS_CENTS[model] ?? 0;
  return Math.round((totalTokens / 1000) * rate * 100) / 100;
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
export async function logAiUsage(
  supabase: SupabaseLike,
  entry: LogAiUsageEntry,
): Promise<void> {
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

export function moderateInputText(text: string): {
  allowed: boolean;
  reason?: string;
} {
  for (const pattern of BLOCKED_INPUT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        reason:
          "This request could not be processed. Please rephrase and try again.",
      };
    }
  }
  return { allowed: true };
}

/** Extracts real token counts from an OpenRouter-compatible response body. */
export function extractTokenUsage(
  body:
    | { usage?: { prompt_tokens?: number; completion_tokens?: number } }
    | null
    | undefined,
): {
  inputTokens: number | null;
  outputTokens: number | null;
} {
  return {
    inputTokens: body?.usage?.prompt_tokens ?? null,
    outputTokens: body?.usage?.completion_tokens ?? null,
  };
}

const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://venora.app",
    "X-Title": "Venora AI",
  };
}

/**
 * Calls the approved OpenRouter chat-completions endpoint. Transient 429 and
 * 5xx responses are retried once against the same approved model; no provider
 * or model fallback is selected silently.
 */
export async function postChatCompletion(
  config: AiConfiguration,
  openRouterApiKey: string,
  body: Record<string, unknown>,
): Promise<{
  response: Response;
  providerUsed: string;
  modelUsed: string;
  usedFallback: boolean;
}> {
  const validation = validateProviderModel(config);
  if (!validation.ok) {
    throw new Error(validation.reason ?? "Invalid AI provider configuration");
  }
  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  let lastStatus: number | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchWithTimeout(
      OPENROUTER_CHAT_COMPLETIONS_URL,
      {
        method: "POST",
        headers: openRouterHeaders(openRouterApiKey),
        body: JSON.stringify({ ...body, model: config.model }),
      },
      config.timeoutSeconds,
    );
    if (response.ok) {
      return {
        response,
        providerUsed: APPROVED_AI_PROVIDER,
        modelUsed: APPROVED_AI_MODEL,
        usedFallback: false,
      };
    }
    lastStatus = response.status;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 1) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `OpenRouter request failed${
      lastStatus === null ? "" : ` with status ${lastStatus}`
    }`,
  );
}
