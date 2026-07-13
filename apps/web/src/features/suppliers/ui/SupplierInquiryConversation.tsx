"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Loader2, Lock } from "lucide-react";
import { sendCustomerInquiryMessageAction } from "../application/actions";

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function RoleLabel({ role, name }: { role: "customer" | "supplier", name?: string | null | undefined }) {
  const label = role === "customer" ? (name || "Customer") : (name || "Supplier");
  return (
    <span
      className={[
        "inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em]",
        role === "customer"
          ? "bg-[#DBEAFE] text-[#1D4ED8]"
          : "bg-[#D1FAE5] text-[#065F46]",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

interface SupplierInquiryConversationProps {
  inquiryId: string;
  initialMessages: any[];
  currentUserId: string;
  currentRole: "customer" | "supplier";
  isReadOnly: boolean;
  counterpartLabel?: string;
}

export function SupplierInquiryConversation({
  inquiryId,
  initialMessages,
  currentUserId,
  currentRole,
  isReadOnly,
  counterpartLabel = "the supplier",
}: SupplierInquiryConversationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await sendCustomerInquiryMessageAction({
        inquiryId,
        message: trimmed,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      router.refresh();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="flex flex-col gap-4">
      {initialMessages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF]">
            <MessageSquare className="h-5 w-5 text-[#2563EB]" />
          </div>
          <p className="text-sm font-black text-[#111827]">No messages yet</p>
          <p className="max-w-xs text-sm font-medium leading-6 text-[#6B7280]">
            Use this conversation to ask questions or clarify details with {counterpartLabel}.
          </p>
        </div>
      ) : (
        <div className="flex max-h-[480px] flex-col gap-3 overflow-y-auto pr-1">
          {initialMessages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            // The sender_role is implicit for supplier messages
            const role = isOwn ? currentRole : (currentRole === "customer" ? "supplier" : "customer");
            return (
              <div
                key={msg.id}
                className={[
                  "flex flex-col gap-1",
                  isOwn ? "items-end" : "items-start",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex items-center gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row",
                  ].join(" ")}
                >
                  <RoleLabel role={role} name={isOwn ? "You" : undefined} />
                  <span className="text-[11px] font-medium text-[#9CA3AF]">
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>

                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium leading-6 whitespace-pre-wrap break-words",
                    isOwn
                      ? "rounded-tr-sm bg-[#2563EB] text-white"
                      : "rounded-tl-sm border border-[#E5E7EB] bg-white text-[#111827]",
                  ].join(" ")}
                >
                  {msg.message}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isReadOnly ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <Lock className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          <p className="text-sm font-semibold text-[#6B7280]">
            This conversation is closed.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-[#2563EB]/10">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              rows={3}
              placeholder="Type a message… (Ctrl+Enter to send)"
              className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm font-medium text-[#111827] placeholder-[#9CA3AF] outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
              <span className="text-xs font-medium text-[#9CA3AF]">
                {text.length}/2000
              </span>
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || isPending || text.length > 2000}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-xs font-black text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
