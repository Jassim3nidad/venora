/**
 * Shared OpenRouter config for Edge Functions.
 *
 * OpenRouter's /chat/completions endpoint is OpenAI-wire-compatible
 * (same request/response shape, same SSE streaming format), so every
 * function just swaps its base URL + auth header + default model —
 * no SDK, same raw-fetch pattern as everything else here.
 *
 * OpenRouter is the only approved AI provider. Venue facts and search
 * ranking remain database-grounded; no direct provider-specific embeddings
 * path is used.
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
