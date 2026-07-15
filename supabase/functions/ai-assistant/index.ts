/**
 * Supabase Edge Function: ai-assistant
 *
 * Site-wide customer chat assistant. Streams the OpenRouter response back
 * to the client as raw SSE (the one deliberate exception to this
 * codebase's {data,error} JSON envelope — a single JSON response can't
 * stream). Retrieval context (matching venues, the caller's own recent
 * bookings) is injected as a system message so the model never has to
 * invent prices, availability, or booking details.
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cleanString, looksVenueRelated } from "../_shared/text.ts";
import { toVenuePayload } from "../_shared/venues.ts";
import {
  OPENROUTER_BASE_URL,
  openRouterHeaders,
} from "../_shared/openrouter.ts";
import {
  checkAiUsageLimits,
  estimateCostCents,
  fetchWithTimeout,
  loadAiConfig,
  logAiUsage,
  moderateInputText,
  validateProviderModel,
} from "../_shared/ai-config.ts";

/** Rough token estimate for streaming responses, where the provider
 * doesn't return a `usage` object the way non-streaming calls do. This is
 * for the estimated_cost_cents/token *logging* columns only — never used
 * for anything enforcement-critical. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const maxMessagesPerConversation = 60; // 30 user + 30 assistant turns
const historyLimit = 20;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500) {
  return jsonResponse({ data: null, error: { code, message } }, status);
}

async function getAuthenticatedUser(req: Request, supabaseUrl: string) {
  const authorization = req.headers.get("Authorization");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authorization || !anonKey) return null;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await userClient.auth.getUser();
  return data.user ?? null;
}

const systemPrompt =
  "You are Venora's customer assistant for a Philippine event-venue marketplace. Help users find venues, understand packages and pricing, and answer questions about their own bookings when logged in. Use only the venue/booking facts provided in the context message — never invent prices, availability, or booking details. If you don't have enough information, say so and suggest using search or contacting the venue. Keep answers under 120 words unless asked for detail.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Use POST to chat with the assistant.",
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        "CONFIGURATION_ERROR",
        "Missing Supabase configuration.",
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fail closed: an admin-disabled feature (or an unsupported
    // provider/model) never reaches the AI provider at all.
    const config = await loadAiConfig(supabase, "assistant");
    if (!config) {
      return errorResponse(
        "AI_CONFIG_MISSING",
        "AI configuration for this feature is missing.",
        500,
      );
    }
    if (!config.enabled) {
      return errorResponse(
        "AI_FEATURE_DISABLED",
        "The assistant is currently disabled.",
        403,
      );
    }
    const providerCheck = validateProviderModel(config);
    if (!providerCheck.ok) {
      return errorResponse(
        "AI_PROVIDER_UNSUPPORTED",
        providerCheck.reason!,
        500,
      );
    }

    if (!openRouterApiKey) {
      return errorResponse(
        "OPENROUTER_NOT_CONFIGURED",
        "OPENROUTER_API_KEY is not configured.",
        500,
      );
    }

    const rawBody = await req.json().catch(() => null);
    const sessionId = cleanString(rawBody?.sessionId, 100);
    const message = cleanString(rawBody?.message, 2000);
    const requestedConversationId = cleanString(rawBody?.conversationId, 100);

    if (!sessionId || !message) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Provide a sessionId and a message.",
        400,
      );
    }

    if (config.moderationEnabled) {
      const moderation = moderateInputText(message);
      if (!moderation.allowed) {
        return errorResponse("AI_MODERATION_BLOCKED", moderation.reason!, 400);
      }
    }

    const limitCheck = await checkAiUsageLimits(supabase, "assistant", config);
    if (!limitCheck.allowed) {
      return errorResponse("AI_LIMIT_EXCEEDED", limitCheck.reason!, 429);
    }

    const user = await getAuthenticatedUser(req, supabaseUrl);

    // Resolve or create the conversation.
    let conversationId: string | null = null;

    if (requestedConversationId) {
      const { data: existing } = await supabase
        .from("ai_conversations")
        .select("id, session_id, user_id")
        .eq("id", requestedConversationId)
        .maybeSingle();

      if (existing && existing.session_id === sessionId) {
        conversationId = existing.id;
      }
    }

    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user?.id ?? null, session_id: sessionId })
        .select("id")
        .single();

      if (createError || !created) {
        console.error(
          "[ai-assistant] Failed to create conversation:",
          createError,
        );
        return errorResponse(
          "CONVERSATION_FAILED",
          "Could not start a conversation.",
          500,
        );
      }
      conversationId = created.id;
    }

    const { count: messageCount } = await supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);

    if ((messageCount ?? 0) >= maxMessagesPerConversation) {
      return errorResponse(
        "CONVERSATION_LIMIT_REACHED",
        "This conversation has reached its message limit. Please start a new one.",
        429,
      );
    }

    const { data: priorMessages } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(historyLimit);

    // Retrieval context — never let the model invent facts.
    const contextParts: string[] = [];

    if (looksVenueRelated(message)) {
      const { data: venueRows } = await supabase.rpc("search_venues", {
        query_embedding: null,
        keyword: message.slice(0, 200),
        match_count: 5,
        sort_by: "relevance",
      });

      const venues = (venueRows ?? []).slice(0, 5).map(toVenuePayload);
      if (venues.length > 0) {
        contextParts.push(
          `Matching venues: ${
            JSON.stringify(
              venues.map((v: any) => ({
                name: v.name,
                city: v.city,
                province: v.province,
                basePrice: v.basePrice,
                capacityMin: v.capacityMin,
                capacityMax: v.capacityMax,
                avgRating: v.avgRating,
              })),
            )
          }`,
        );
      }
    }

    if (user) {
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("event_date, status, venues(name)")
        .eq("customer_id", user.id)
        .order("event_date", { ascending: false })
        .limit(5);

      if (bookingRows && bookingRows.length > 0) {
        contextParts.push(
          `This user's recent bookings: ${
            JSON.stringify(
              bookingRows.map((b: any) => ({
                venue: b.venues?.name ?? "Unknown venue",
                eventDate: b.event_date,
                status: b.status,
              })),
            )
          }`,
        );
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(contextParts.length > 0
        ? [{ role: "system" as const, content: contextParts.join("\n") }]
        : []),
      ...(priorMessages ?? []).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Persist the user's message immediately so it survives even if the
    // completion call below fails partway through.
    const { error: userMessageError } = await supabase.from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
      });
    if (userMessageError) {
      console.error(
        "[ai-assistant] Failed to persist user message:",
        userMessageError,
      );
    }

    const assistantRequestStartedAt = Date.now();
    const upstream = await fetchWithTimeout(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: openRouterHeaders(openRouterApiKey),
        body: JSON.stringify({
          model: config.model,
          temperature: config.temperature ?? 0.4,
          // Generous budget — the default free model reasons before writing
          // content; too low a cap truncates it mid-thought.
          max_tokens: config.maxTokens,
          stream: true,
          messages,
        }),
      },
      config.timeoutSeconds,
    );

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text().catch(() => "");
      console.error(
        "[ai-assistant] OpenRouter stream request failed:",
        errorText,
      );
      await logAiUsage(supabase, {
        feature: "assistant",
        provider: config.provider,
        model: config.model,
        actorId: user?.id ?? null,
        durationMs: Date.now() - assistantRequestStartedAt,
        success: false,
        errorCategory: "provider_error",
      });
      return errorResponse(
        "ASSISTANT_FAILED",
        "The assistant is temporarily unavailable.",
        502,
      );
    }

    const finalConversationId = conversationId;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Side-channel event so the client learns the conversation id —
        // distinguishable from OpenRouter chunks, which have `choices`.
        controller.enqueue(
          encoder.encode(
            `data: ${
              JSON.stringify({ conversationId: finalConversationId })
            }\n\n`,
          ),
        );

        const reader = upstream.body!.getReader();
        let sseBuffer = "";
        let fullText = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;

              try {
                const json = JSON.parse(payload);
                const delta = json?.choices?.[0]?.delta?.content;
                if (typeof delta === "string") fullText += delta;
              } catch {
                // Partial JSON split across a chunk boundary — ignored, the
                // remainder is re-parsed once the rest of the line arrives.
              }
            }
          }
        } catch (streamError) {
          console.error("[ai-assistant] Stream read failed:", streamError);
        } finally {
          if (fullText.trim()) {
            const { error: assistantMessageError } = await supabase.from(
              "ai_messages",
            ).insert({
              conversation_id: finalConversationId,
              role: "assistant",
              content: fullText.trim(),
            });
            if (assistantMessageError) {
              console.error(
                "[ai-assistant] Failed to persist assistant message:",
                assistantMessageError,
              );
            }
          }

          // Streaming responses don't return a `usage` object the way
          // non-streaming calls do — token counts here are a character-based
          // estimate (see estimateTokens), used only for the usage-log
          // budgeting columns, never for enforcement.
          const inputTokens = estimateTokens(
            messages.map((m) => m.content).join("\n"),
          );
          const outputTokens = estimateTokens(fullText);
          await logAiUsage(supabase, {
            feature: "assistant",
            provider: config.provider,
            model: config.model,
            actorId: user?.id ?? null,
            inputTokens,
            outputTokens,
            estimatedCostCents: estimateCostCents(
              config.model,
              inputTokens + outputTokens,
            ),
            durationMs: Date.now() - assistantRequestStartedAt,
            success: fullText.trim().length > 0,
            errorCategory: fullText.trim().length > 0 ? null : "empty_response",
          });

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[ai-assistant] Unexpected error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error
        ? error.message
        : "Assistant is temporarily unavailable.",
      500,
    );
  }
});
