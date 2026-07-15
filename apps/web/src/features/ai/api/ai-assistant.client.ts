import { createClient } from "@/lib/supabase/client";

export class AIAssistantClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AIAssistantClientError";
    this.code = code;
  }
}

export type AssistantStreamEvent =
  | { type: "conversationId"; conversationId: string }
  | { type: "delta"; text: string };

interface StreamAssistantReplyInput {
  conversationId: string | null;
  sessionId: string;
  message: string;
}

/**
 * Streams the assistant's reply as an async generator of SSE-derived
 * events. Uses a raw `fetch` against the function URL (not
 * `supabase.functions.invoke`, which buffers the whole response and
 * can't be read incrementally).
 */
export async function* streamAssistantReply(
  input: StreamAssistantReplyInput,
): AsyncGenerator<AssistantStreamEvent> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new AIAssistantClientError(
      "CONFIGURATION_ERROR",
      "Assistant is not configured.",
    );
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? anonKey;

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      conversationId: input.conversationId,
      sessionId: input.sessionId,
      message: input.message,
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    let message = "Assistant is temporarily unavailable.";
    let code = "REQUEST_FAILED";
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error?.message) message = parsed.error.message;
      if (parsed?.error?.code) code = parsed.error.code;
    } catch {
      // Non-JSON error body — keep the default message.
    }
    throw new AIAssistantClientError(code, message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload);
        if (typeof json.conversationId === "string") {
          yield { type: "conversationId", conversationId: json.conversationId };
          continue;
        }
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) {
          yield { type: "delta", text: delta };
        }
      } catch {
        // Partial JSON split across a chunk boundary — ignored.
      }
    }
  }
}
