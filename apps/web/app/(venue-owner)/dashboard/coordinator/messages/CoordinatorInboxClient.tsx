"use client";

import { useState, useMemo, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquareText, CalendarDays, Search, MapPin, Inbox, ArrowLeft } from "lucide-react";
import { BookingConversation } from "@/src/features/booking/ui/BookingConversation";
import type { BookingMessage } from "@/src/features/booking/application/messages-actions";

export type InboxThread = {
  id: string;
  customerName: string;
  venueName: string;
  venueSlug?: string | undefined;
  eventDate: string;
  status: string;
  kind?: "booking" | "inquiry";
  serviceName?: string | undefined;
  latestMessage?:
    | {
        message: string;
        created_at: string;
        sender_role: "customer" | "venue_owner" | "venue_team";
        sender_name: string | null;
      }
    | undefined;
  needsReply?: boolean | undefined;
  isUnread?: boolean | undefined;
};

export function CoordinatorInboxClient({
  threads,
  currentUserId,
}: {
  threads: InboxThread[];
  currentUserId: string;
}) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Filter threads based on search
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const lowerQuery = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.customerName.toLowerCase().includes(lowerQuery) ||
        t.venueName.toLowerCase().includes(lowerQuery)
    );
  }, [threads, searchQuery]);

  // Sort threads by latest message date, or event date if no messages
  const sortedThreads = useMemo(() => {
    return [...filteredThreads].sort((a, b) => {
      const dateA = a.latestMessage ? new Date(a.latestMessage.created_at).getTime() : new Date(a.eventDate).getTime();
      const dateB = b.latestMessage ? new Date(b.latestMessage.created_at).getTime() : new Date(b.eventDate).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [filteredThreads]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  // Fetch full messages when a thread is selected
  useEffect(() => {
    if (!selectedThread) return;
    let isMounted = true;
    setIsLoadingMessages(true);

    const load =
      selectedThread.kind === "inquiry"
        ? import("@/src/features/venues/application/inquiry-messages-actions").then(
            (mod) => mod.getVenueInquiryMessages(selectedThread.id).then((msgs) => msgs.map((m: any): BookingMessage => ({
              id: m.id,
              booking_id: m.inquiry_id,
              sender_id: m.sender_id,
              sender_role: m.sender_id === currentUserId ? "venue_owner" : "customer",
              message: m.message,
              created_at: m.created_at,
              sender_name: m.sender_name ?? null
            })))
          )
        : import("@/src/features/booking/application/messages-actions").then(
            (mod) => mod.getBookingMessages(selectedThread.id),
          );

    load
      .then((data) => {
        if (isMounted) {
          setMessages(data);
          setIsLoadingMessages(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedThreadId]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(d);
  }

  function formatTimeAgo(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    try {
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return "";
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px] overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-sm shadow-slate-200/60">
      
      {/* LEFT PANE: Sidebar List */}
      <div className={`flex w-full flex-col border-r border-[#e5e7eb] bg-[#f8fafc] md:w-[350px] lg:w-[400px] shrink-0 ${selectedThread ? "hidden md:flex" : "flex"}`}>
        <div className="p-5 border-b border-[#e5e7eb] bg-white">
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a] mb-4">
            Inbox
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] py-2 pl-9 pr-4 text-sm font-medium text-[#0f172a] placeholder-[#94a3b8] focus:border-[#1d4ed8] focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {sortedThreads.length === 0 ? (
            <div className="mt-10 flex flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9]">
                <MessageSquareText className="h-5 w-5 text-[#94a3b8]" />
              </div>
              <p className="mt-4 text-sm font-bold text-[#475569]">
                No conversations found.
              </p>
              <p className="mt-1 text-xs text-[#94a3b8]">
                Try adjusting your search.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedThreads.map((thread) => {
                const isActive = thread.id === selectedThreadId;
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? "border-[#1d4ed8] bg-[#f8fbff] shadow-sm shadow-blue-900/5"
                        : "border-transparent bg-white hover:border-[#e5e7eb] hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-[#0f172a] truncate">
                        {thread.customerName}
                      </div>
                      {thread.latestMessage && (
                        <div className="text-[10px] font-semibold text-[#64748b] shrink-0 mt-0.5">
                          {formatTimeAgo(thread.latestMessage.created_at)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
                      <MapPin className="h-3 w-3 text-[#1d4ed8]" />
                      <span className="truncate">{thread.venueName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
                      <CalendarDays className="h-3 w-3 text-[#1d4ed8]" />
                      <span>{formatDate(thread.eventDate)}</span>
                      <span className="mx-1 h-1 w-1 rounded-full bg-[#cbd5e1]" />
                      <span className="capitalize">{thread.status.replace(/_/g, " ")}</span>
                    </div>

                    <p className={`mt-1 text-sm line-clamp-2 ${isActive ? "text-[#1e293b]" : "text-[#64748b]"}`}>
                      {thread.latestMessage ? (
                        <>
                          <span className="font-semibold text-[#0f172a] mr-1">
                            {thread.latestMessage.sender_role === "venue_owner" ? "You:" : `${thread.customerName}:`}
                          </span>
                          {thread.latestMessage.message}
                        </>
                      ) : (
                        <span className="italic text-[#94a3b8]">No messages yet.</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Conversation Area */}
      <div className={`flex-1 bg-white relative flex-col ${selectedThread ? "flex" : "hidden md:flex"}`}>
        {!selectedThread ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8fafc]/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm border border-[#e5e7eb]">
              <Inbox className="h-6 w-6 text-[#94a3b8]" />
            </div>
            <h3 className="mt-5 text-base font-bold text-[#0f172a]">
              Your messages
            </h3>
            <p className="mt-2 max-w-[250px] text-center text-sm font-medium text-[#64748b]">
              Select a conversation from the sidebar to view messages and respond to customers.
            </p>
          </div>
        ) : isLoadingMessages ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e5e7eb] border-t-[#1d4ed8]" />
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="md:hidden flex items-center border-b border-[#e5e7eb] bg-white p-3">
              <button
                onClick={() => setSelectedThreadId(null)}
                className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm font-bold text-[#475569] shadow-sm hover:bg-[#f8fafc]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Inbox
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4 sm:p-6 flex flex-col">
              <BookingConversation
                bookingId={selectedThread.id}
                initialMessages={messages}
                currentUserId={currentUserId}
                currentRole="venue_owner"
                isReadOnly={false}
                header={{
                  role: "venue_owner",
                  customerName: selectedThread.customerName,
                  serviceName: selectedThread.serviceName,
                  inquiryRef: `Booking #${selectedThread.id.substring(0, 8)}`,
                  eventType: "Event",
                  eventDate: formatDate(selectedThread.eventDate),
                  venueName: selectedThread.venueName,
                  venueLink: selectedThread.venueSlug ? `/venues/${selectedThread.venueSlug}` : undefined,
                  statusLabel: selectedThread.status.replace(/_/g, " "),
                }}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
