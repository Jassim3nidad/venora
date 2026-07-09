/**
 * Shared OpenRouter config for Edge Functions.
 *
 * OpenRouter's /chat/completions endpoint is OpenAI-wire-compatible
 * (same request/response shape, same SSE streaming format), so every
 * function just swaps its base URL + auth header + default model —
 * no SDK, same raw-fetch pattern as everything else here.
 *
 * OpenRouter does not proxy an /embeddings endpoint, so semantic
 * search embeddings still go directly to OpenAI (see embeddings.ts)
 * via the separate, fully-optional OPENAI_API_KEY.
 */

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_CHAT_MODEL = "tencent/hy3:free";

export function openRouterHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    // Optional attribution headers OpenRouter uses for its public rankings —
    // harmless to omit, cheap to include.
    "HTTP-Referer": "https://venora.app",
    "X-Title": "Venora AI",
  };
}
