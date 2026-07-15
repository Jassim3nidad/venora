"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  streamAssistantReply,
  AIAssistantClientError,
} from "../api/ai-assistant.client";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SESSION_STORAGE_KEY = "venora_assistant_session_id";
const CONVERSATION_STORAGE_KEY = "venora_assistant_conversation_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function useAssistantConversation() {
  const [sessionId, setSessionId] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    const storedConversationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(CONVERSATION_STORAGE_KEY)
        : null;
    if (storedConversationId) {
      setConversationId(storedConversationId);
      conversationIdRef.current = storedConversationId;
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !sessionId) return;

      setError(null);
      const userMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      const assistantMessageId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);
      setIsStreaming(true);

      try {
        for await (const event of streamAssistantReply({
          conversationId: conversationIdRef.current,
          sessionId,
          message: trimmed,
        })) {
          if (event.type === "conversationId") {
            conversationIdRef.current = event.conversationId;
            setConversationId(event.conversationId);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                CONVERSATION_STORAGE_KEY,
                event.conversationId,
              );
            }
            continue;
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: m.content + event.text }
                : m,
            ),
          );
        }
      } catch (err) {
        const message =
          err instanceof AIAssistantClientError
            ? err.message
            : "Something went wrong. Please try again.";
        setError(message);
        // Drop the placeholder only if no partial content ever arrived.
        setMessages((prev) =>
          prev.filter(
            (m) => m.id !== assistantMessageId || m.content.length > 0,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, sessionId],
  );

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    conversationIdRef.current = null;
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    }
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    error,
    startNewConversation,
    ready: Boolean(sessionId),
    conversationId,
  };
}
