"use client";

import { useRef, useState, useTransition, useEffect, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Loader2, AlertCircle, CalendarDays, MapPin, BriefcaseBusiness, ExternalLink } from "lucide-react";
import Link from "next/link";
import { sendBookingMessageAction } from "../application/messages-actions";
import type { BookingMessage } from "../application/messages-actions";

type BookingConversationHeaderProps = {
  role: "customer" | "venue_owner";
  supplierName?: string | undefined;
  supplierLogo?: string | null | undefined;
  supplierSlug?: string | undefined;
  customerName?: string | undefined;
  serviceName?: string | undefined;
  inquiryRef?: string | undefined;
  eventType?: string | undefined;
  eventDate?: string | undefined;
  venueName?: string | undefined;
  venueLink?: string | undefined;
  statusLabel: string;
};

// Helpers
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

export function BookingConversation({
  bookingId,
  initialMessages,
  currentUserId,
  currentRole,
  isReadOnly,
  header,
  counterpartLabel = "the other party",
}: {
  bookingId: string;
  initialMessages: BookingMessage[];
  currentUserId: string;
  currentRole: "customer" | "venue_owner";
  isReadOnly: boolean;
  header?: BookingConversationHeaderProps;
  counterpartLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    initialMessages,
    (state, newMessage: BookingMessage) => [...state, newMessage]
  );

  // Group messages
  const groupedMessages: { date: string; items: BookingMessage[][] }[] = [];
  let currentGroup: BookingMessage[] = [];
  let currentDate = "";

  optimisticMessages.forEach((msg) => {
    const msgDate = formatDateSeparator(msg.created_at);
    if (msgDate !== currentDate) {
      if (currentGroup.length > 0) {
        let lastDateGroup = groupedMessages[groupedMessages.length - 1];
        if (!lastDateGroup || lastDateGroup.date !== currentDate) {
          groupedMessages.push({ date: currentDate, items: [currentGroup] });
        } else {
          lastDateGroup.items.push(currentGroup);
        }
      }
      currentDate = msgDate;
      currentGroup = [msg];
    } else {
      const prevMsg = currentGroup[currentGroup.length - 1];
      if (!prevMsg) {
        currentGroup.push(msg);
        return;
      }
      const timeDiff =
        new Date(msg.created_at).getTime() -
        new Date(prevMsg.created_at).getTime();
      const isSameSender = prevMsg.sender_id === msg.sender_id;

      if (isSameSender && timeDiff < 5 * 60 * 1000) {
        currentGroup.push(msg);
      } else {
        let lastDateGroup = groupedMessages[groupedMessages.length - 1];
        if (!lastDateGroup || lastDateGroup.date !== currentDate) {
          groupedMessages.push({ date: currentDate, items: [currentGroup] });
        } else {
          lastDateGroup.items.push(currentGroup);
        }
        currentGroup = [msg];
      }
    }
  });

  if (currentGroup.length > 0) {
    let lastDateGroup = groupedMessages[groupedMessages.length - 1];
    if (!lastDateGroup || lastDateGroup.date !== currentDate) {
      groupedMessages.push({ date: currentDate, items: [currentGroup] });
    } else {
      lastDateGroup.items.push(currentGroup);
    }
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [optimisticMessages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending || isReadOnly) return;
    setError(null);

    const tempId = `temp-${Date.now()}`;
    const newMsg: BookingMessage = {
      id: tempId,
      booking_id: bookingId,
      sender_id: currentUserId,
      sender_role: currentRole,
      message: trimmed,
      created_at: new Date().toISOString(),
    };

    startTransition(async () => {
      addOptimisticMessage(newMsg);

      const result = await sendBookingMessageAction({
        bookingId,
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
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full min-h-[600px] max-h-[800px]">
      {/* ── Conversation Header ── */}
      {header && (
        <div className="border-b border-slate-200 bg-slate-50/50 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              {header.role === "customer" && header.supplierLogo !== undefined && (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                  {header.supplierLogo ? (
                    <img
                      src={header.supplierLogo}
                      alt={header.supplierName || "Supplier"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 font-bold text-slate-400">
                      {header.supplierName?.charAt(0) || "S"}
                    </div>
                  )}
                </div>
              )}
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  {header.role === "customer"
                    ? header.supplierName || "Supplier"
                    : header.customerName || "Customer"}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-600">
                  {header.serviceName && (
                    <span className="flex items-center gap-1">
                      <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-400" />
                      {header.serviceName}
                    </span>
                  )}
                  {header.inquiryRef && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{header.inquiryRef}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {header.role === "customer" && header.supplierSlug && (
              <Link
                href={`/suppliers/${header.supplierSlug}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Venue
              </Link>
            )}
          </div>

          {/* Context Row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white p-3 border border-slate-200 text-xs sm:text-sm font-medium text-slate-600">
            {header.eventType && header.eventDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                {header.eventType} &middot; {header.eventDate}
              </span>
            )}
            {header.venueName && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                {header.venueLink ? (
                  <Link
                    href={header.venueLink}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {header.venueName}
                  </Link>
                ) : (
                  header.venueName
                )}
              </span>
            )}
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {header.statusLabel}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── Message History ── */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-5">
        <div className="mx-auto max-w-[800px] flex flex-col gap-6">
          {groupedMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-black text-slate-900">No messages yet</p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Start the conversation by sending a message below.
              </p>
            </div>
          )}

          {groupedMessages.map((dateGroup, dIdx) => (
            <div key={dIdx} className="flex flex-col gap-6">
              {/* Date Separator */}
              <div className="flex items-center justify-center">
                <span className="rounded-full bg-slate-200/60 px-3 py-1 text-[11px] font-bold text-slate-600">
                  {dateGroup.date}
                </span>
              </div>

              {/* Message Groups */}
              {dateGroup.items.map((group, gIdx) => {
                const firstMsg = group[0];
                if (!firstMsg) return null;
                const isOwn = firstMsg.sender_id === currentUserId;
                const senderLabel = isOwn
                  ? "You"
                  : firstMsg.sender_role === "customer"
                    ? "Customer"
                    : "Venue Owner";

                return (
                  <div
                    key={gIdx}
                    className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
                  >
                    <span className="mb-1 text-[11px] font-bold text-slate-500">
                      {senderLabel}
                    </span>
                    {group.map((msg, mIdx) => {
                      const isFirst = mIdx === 0;
                      const isLast = mIdx === group.length - 1;
                      return (
                        <div
                          key={msg.id}
                          className="flex flex-col gap-1 max-w-[85%] sm:max-w-[75%]"
                        >
                          <div
                            className={`px-4 py-2.5 text-[14px] sm:text-[15px] font-medium leading-relaxed ${isOwn
                              ? "bg-blue-600 text-white"
                              : "bg-white border border-slate-200 text-slate-900 shadow-sm"
                              } ${isOwn
                                ? `rounded-l-2xl ${isFirst ? "rounded-tr-2xl" : "rounded-tr-md"
                                } ${isLast ? "rounded-br-2xl" : "rounded-br-md"
                                }`
                                : `rounded-r-2xl ${isFirst ? "rounded-tl-2xl" : "rounded-tl-md"
                                } ${isLast ? "rounded-bl-2xl" : "rounded-bl-md"
                                }`
                              }`}
                          >
                            <span className="whitespace-pre-wrap">{msg.message}</span>
                          </div>
                          {isLast && (
                            <span
                              className={`text-[10px] font-semibold text-slate-400 ${isOwn ? "text-right" : "text-left"
                                }`}
                            >
                              {formatMessageTime(msg.created_at)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* ── Composer ── */}
      <div className="border-t border-slate-200 bg-white p-4 shrink-0">
        {isReadOnly ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600 justify-center">
            <AlertCircle className="h-4 w-4" />
            This conversation is read-only because the booking is no longer active.
          </div>
        ) : (
          <div className="mx-auto max-w-[800px] flex flex-col gap-2">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={handleSend}
                  className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold hover:bg-red-200 transition"
                >
                  Retry
                </button>
              </div>
            )}
            <div
              className={`relative flex items-end gap-2 rounded-2xl border bg-white p-2 transition-colors ${error
                ? "border-red-300 ring-4 ring-red-100"
                : "border-slate-300 focus-within:border-blue-600"
                }`}
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                rows={1}
                placeholder="Write a message..."
                className="w-full resize-none bg-transparent py-2 pl-3 pr-2 text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 disabled:opacity-50"
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || isPending}
                aria-label="Send message"
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
