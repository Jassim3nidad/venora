"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useAssistantConversation } from "../hooks/use-assistant-conversation";

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const {
    messages,
    sendMessage,
    isStreaming,
    error,
    startNewConversation,
    ready,
  } = useAssistantConversation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || isStreaming) return;
    const text = draft;
    setDraft("");
    void sendMessage(text);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-base)] shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--color-brand-600)] px-4 py-3.5">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-bold">Venora Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startNewConversation}
                title="New conversation"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="rounded-2xl bg-[var(--bg-subtle)] p-3.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                Hi! Ask me about venues, packages, pricing, or your bookings.
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-[var(--color-brand-600)] text-white"
                      : "bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                  }`}
                >
                  {message.content || (
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Thinking...
                    </span>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-[var(--border-default)] p-3"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!ready || isStreaming}
              placeholder="Ask about a venue or your booking..."
              className="h-10 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!ready || isStreaming || !draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-600)] text-white transition hover:bg-[var(--color-brand-700)] disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white shadow-xl transition hover:bg-[var(--color-brand-700)] hover:scale-105"
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
