"use client";

import { useState, useMemo, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquareText, CalendarDays, Search, MapPin, Inbox, ArrowLeft, AlertCircle } from "lucide-react";
import { BookingConversation } from "@/src/features/booking/ui/BookingConversation";
import type { BookingMessage } from "@/src/features/booking/application/messages-actions";

export type CustomerInboxThread = {
  id: string;
  kind: "booking" | "venue_inquiry" | "supplier_inquiry";
  partnerName: string;
  partnerSlug?: string | undefined;
  serviceName?: string | undefined;
  eventDate?: string | null;
  status: string;
  latestMessage?:
    | {
        message: string;
        created_at: string;
        sender_role: "customer" | "venue_owner" | "venue_team" | "partner" | string;
      }
    | undefined;
};

export function CustomerInboxClient({
  threads,
  currentUserId,
}: {
  threads: CustomerInboxThread[];
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
        t.partnerName.toLowerCase().includes(lowerQuery) ||
        (t.serviceName && t.serviceName.toLowerCase().includes(lowerQuery))
    );
  }, [threads, searchQuery]);

  // Sort threads by latest message date, or event date if no messages
  const sortedThreads = useMemo(() => {
    return [...filteredThreads].sort((a, b) => {
      const dateA = a.latestMessage ? new Date(a.latestMessage.created_at).getTime() : (a.eventDate ? new Date(a.eventDate).getTime() : 0);
      const dateB = b.latestMessage ? new Date(b.latestMessage.created_at).getTime() : (b.eventDate ? new Date(b.eventDate).getTime() : 0);
      return dateB - dateA;
    });
  }, [filteredThreads]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  // Fetch full messages when a thread is selected
  useEffect(() => {
    if (!selectedThread) return;
    let isMounted = true;
    setIsLoadingMessages(true);

    let load;
    if (selectedThread.kind === "booking") {
      load = import("@/src/features/booking/application/messages-actions").then(
        (mod) => mod.getBookingMessages(selectedThread.id)
      );
    } else if (selectedThread.kind === "venue_inquiry") {
      load = import("@/src/features/venues/application/inquiry-messages-actions").then(
        (mod) => mod.getVenueInquiryMessages(selectedThread.id)
      );
    } else {
      load = import("@/src/features/messages/application/customer-inbox-actions").then(
        (mod) => mod.getSupplierInquiryMessages(selectedThread.id)
      );
    }

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
  }, [selectedThread?.id, selectedThread?.kind]);

  function formatDate(iso: string | null | undefined) {
    if (!iso) return "No date set";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "No date set";
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
    <div className="flex h-full min-h-[600px] overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-sm shadow-slate-200/60">
      
      {/* LEFT PANE: Sidebar List */}
      <div className={`flex w-full flex-col border-r border-[#e5e7eb] bg-[#f8fafc] md:w-[350px] lg:w-[400px] shrink-0 ${selectedThread ? "hidden md:flex" : "flex"}`}>
        <div className="p-5 border-b border-[#e5e7eb] bg-white">
          <h2 className="text-xl font-black tracking-tight text-[#0f172a] mb-4">
            Unified Inbox
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
                        {thread.partnerName}
                      </div>
                      {thread.latestMessage && (
                        <div className="text-[10px] font-semibold text-[#64748b] shrink-0 mt-0.5">
                          {formatTimeAgo(thread.latestMessage.created_at)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
                      <span className="truncate">{thread.serviceName || "Conversation"}</span>
                      <span className="mx-1 h-1 w-1 rounded-full bg-[#cbd5e1]" />
                      <span className="capitalize text-[#1d4ed8]">{thread.kind.replace("_", " ")}</span>
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
                            {thread.latestMessage.sender_role === "customer" ? "You:" : `${thread.partnerName}:`}
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
            <h3 className="mt-5 text-base font-black text-[#0f172a]">
              Your messages
            </h3>
            <p className="mt-2 max-w-[250px] text-center text-sm font-medium text-[#64748b]">
              Select a conversation from the sidebar to view messages and respond.
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
            <div className="flex-1 overflow-hidden p-4 sm:p-6 flex flex-col relative">
              {/* Note: the existing BookingConversation currently only supports booking_id for sending messages. 
                  So for inquiries, we treat them as read-only or it will throw an error since the route expects a booking. */}
              {selectedThread.kind !== "booking" && (
                <div className="absolute top-8 left-8 right-8 z-10">
                  <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800 shadow-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Viewing {selectedThread.kind.replace("_", " ")} history. Navigate to the inquiry details to send a new message.
                  </div>
                </div>
              )}
              
              <BookingConversation
                bookingId={selectedThread.id}
                initialMessages={messages}
                currentUserId={currentUserId}
                currentRole="customer"
                isReadOnly={selectedThread.kind !== "booking"}
                header={{
                  role: "customer",
                  supplierName: selectedThread.partnerName,
                  serviceName: selectedThread.serviceName,
                  inquiryRef: `${selectedThread.kind.replace("_", " ").toUpperCase()} #${selectedThread.id.substring(0, 8)}`,
                  eventType: selectedThread.kind === "booking" ? "Event Booking" : "Inquiry",
                  eventDate: selectedThread.eventDate ? formatDate(selectedThread.eventDate) : "TBD",
                  venueName: selectedThread.partnerName,
                  venueLink: selectedThread.partnerSlug ? `/venues/${selectedThread.partnerSlug}` : undefined,
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
