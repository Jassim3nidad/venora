"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  Send,
} from "lucide-react";
import {
  sendVenueInquiryMessageAction,
  type VenueInquiryMessage,
} from "../application/inquiry-messages-actions";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function VenueInquiryConversation({
  inquiryId,
  initialMessages,
  currentUserId,
  isReadOnly,
  customerName,
  venueName,
  venueLink,
  statusLabel,
  counterpartLabel = "the other party",
}: {
  inquiryId: string;
  initialMessages: VenueInquiryMessage[];
  currentUserId: string;
  isReadOnly: boolean;
  customerName?: string;
  venueName?: string;
  venueLink?: string | undefined;
  statusLabel: string;
  counterpartLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    initialMessages,
    (state, newMessage: VenueInquiryMessage) => [...state, newMessage],
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [optimisticMessages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending || isReadOnly) return;
    setError(null);

    const optimistic: VenueInquiryMessage = {
      id: `optimistic-${Date.now()}`,
      inquiry_id: inquiryId,
      sender_id: currentUserId,
      message: trimmed,
      created_at: new Date().toISOString(),
    };

    startTransition(async () => {
      addOptimisticMessage(optimistic);
      setText("");
      const result = await sendVenueInquiryMessageAction({
        inquiryId,
        message: trimmed,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
      <div className="border-b border-[#e5e7eb] bg-[#f8fbff] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-[#0f172a]">
            {customerName ?? "Customer"} · Venue inquiry
          </p>
          <span className="rounded-full border border-[#dbeafe] bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#1d4ed8]">
            {statusLabel}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[#64748b]">
          {venueName ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#1d4ed8]" />
              {venueLink ? (
                <Link
                  href={venueLink}
                  className="inline-flex items-center gap-1 text-[#1d4ed8] hover:underline"
                >
                  {venueName}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                venueName
              )}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-[#1d4ed8]" />
            Pre-booking question
          </span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {optimisticMessages.length === 0 ? (
          <p className="text-sm font-medium text-[#64748b]">
            No messages yet. Start the conversation with {counterpartLabel}.
          </p>
        ) : (
          optimisticMessages.map((msg, index) => {
            const isMine = msg.sender_id === currentUserId;
            const prev = optimisticMessages[index - 1];
            const showDate =
              !prev ||
              formatDateSeparator(prev.created_at) !==
                formatDateSeparator(msg.created_at);

            return (
              <div key={msg.id}>
                {showDate ? (
                  <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    {formatDateSeparator(msg.created_at)}
                  </p>
                ) : null}
                <div
                  className={cx(
                    "flex",
                    isMine ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cx(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm font-medium leading-6",
                      isMine
                        ? "bg-[#1d4ed8] text-white"
                        : "bg-[#f1f5f9] text-[#0f172a]",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p
                      className={cx(
                        "mt-1 text-[10px] font-semibold",
                        isMine ? "text-blue-100" : "text-[#94a3b8]",
                      )}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-[#e5e7eb] p-3">
        {error ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        ) : null}
        {isReadOnly ? (
          <p className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-sm font-medium text-[#64748b]">
            This inquiry is closed. Previous messages remain available.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={`Message ${counterpartLabel}…`}
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm font-medium text-[#0f172a] outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !text.trim()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
