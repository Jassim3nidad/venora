"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import {
  sendPartnershipMessage,
  type PartnershipMessage,
} from "../application/partnership-messages-actions";
import { toast } from "sonner";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

type Props = {
  venueOrgId: string;
  supplierId: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: PartnershipMessage[];
  counterpartLabel: string;
  counterpartRole?: string;
  revalidatePath?: string;
};

export function PartnershipConversation({
  venueOrgId,
  supplierId,
  currentUserId,
  currentUserName,
  initialMessages,
  counterpartLabel,
  counterpartRole,
  revalidatePath: revalPath,
}: Props) {
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, addOptimisticMessage] = useOptimistic<
    PartnershipMessage[],
    PartnershipMessage
  >(initialMessages, (state, newMsg) => [...state, newMsg]);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || isPending) return;

    const optimistic: PartnershipMessage = {
      id: `optimistic-${Date.now()}`,
      sender_id: currentUserId,
      venue_organization_id: venueOrgId,
      supplier_id: supplierId,
      message: trimmed,
      created_at: new Date().toISOString(),
      sender: { full_name: currentUserName, avatar_url: null },
    };

    setDraft("");
    startTransition(async () => {
      addOptimisticMessage(optimistic);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
      const result = await sendPartnershipMessage({
        venueOrgId,
        supplierId,
        message: trimmed,
        ...(revalPath ? { revalidate: revalPath } : {}),
      });
      if (!result.success) {
        toast.error(result.error || "Failed to send message.");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Group messages by date
  let lastDate = "";

  return (
    <div className="rounded-[24px] border border-[#e5e7eb] bg-white shadow-sm shadow-slate-200/60 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shrink-0">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Partnership Chat
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            with <span className="text-slate-700">{counterpartLabel}</span>
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-[300px] max-h-[480px]">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center py-16">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-500">
                No messages yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Start the conversation with {counterpartLabel}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId || msg.id.startsWith("optimistic-");
          const msgDate = new Date(msg.created_at).toDateString();
          const showDateSep = msgDate !== lastDate;
          if (showDateSep) lastDate = msgDate;

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDateSep && (
                <div className="flex items-center gap-3 py-3">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {formatDateSeparator(msg.created_at)}
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
              )}

              <div
                className={`flex items-end gap-2 mb-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                {!isOwn && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[10px] font-bold select-none mb-0.5">
                    {msg.sender?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.sender.avatar_url}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      getInitials(msg.sender?.full_name)
                    )}
                  </div>
                )}

                <div
                  className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}
                >
                  {/* Sender name */}
                  {!isOwn && (
                    <span className="text-[11px] font-semibold text-slate-500 px-1 flex items-center gap-1.5">
                      {msg.sender?.full_name ?? "Partner"}
                      {counterpartRole && (
                        <span className="text-[9px] font-bold bg-slate-200/60 text-slate-500 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                          {counterpartRole}
                        </span>
                      )}
                    </span>
                  )}

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                      isOwn
                        ? "bg-[#111827] text-white rounded-br-md"
                        : "bg-slate-100 text-slate-800 rounded-bl-md"
                    } ${msg.id.startsWith("optimistic-") ? "opacity-70" : ""}`}
                  >
                    {msg.message}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[11px] text-slate-400 px-1">
                    {timeAgo(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose */}
      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/40 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${counterpartLabel}… (Ctrl+Enter to send)`}
            rows={2}
            maxLength={2000}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition font-medium"
          />
          <button
            onClick={handleSubmit}
            disabled={!draft.trim() || isPending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white shadow-sm hover:bg-[#374151] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {draft.length > 1800 && (
          <p className="mt-1 text-xs text-amber-600 font-medium text-right">
            {2000 - draft.length} characters remaining
          </p>
        )}
      </div>
    </div>
  );
}
