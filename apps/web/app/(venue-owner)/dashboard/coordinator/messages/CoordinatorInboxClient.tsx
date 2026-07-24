"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Inbox,
  MapPin,
  MessageSquareText,
  Search,
} from "lucide-react";
import { BookingConversation } from "@/src/features/booking/ui/BookingConversation";
import type { BookingMessage } from "@/src/features/booking/application/messages-actions";
import { VenueInquiryConversation } from "@/src/features/venues/ui/VenueInquiryConversation";
import type { VenueInquiryMessage } from "@/src/features/venues/application/inquiry-messages-actions";

export type InboxThread = {
  key: string;
  kind: "booking" | "inquiry";
  id: string;
  customerName: string;
  venueName: string;
  venueSlug?: string;
  eventDate: string;
  status: string;
  serviceName?: string;
  latestMessage?: {
    message: string;
    created_at: string;
    sender_role: "customer" | "venue_team";
    sender_name: string | null;
  };
  needsReply?: boolean;
  isUnread?: boolean;
};

type FilterValue = "all" | "needs_reply" | "bookings" | "inquiries";

export function CoordinatorInboxClient({
  threads,
  currentUserId,
  initialThreadKey = null,
}: {
  threads: InboxThread[];
  currentUserId: string;
  initialThreadKey?: string | null;
}) {
  const router = useRouter();
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(
    initialThreadKey,
  );
  const [filter, setFilter] = useState<FilterValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingMessages, setBookingMessages] = useState<BookingMessage[]>([]);
  const [inquiryMessages, setInquiryMessages] = useState<VenueInquiryMessage[]>(
    [],
  );
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    if (initialThreadKey) {
      setSelectedThreadKey(initialThreadKey);
    }
  }, [initialThreadKey]);

  const filteredThreads = useMemo(() => {
    let next = threads;
    if (filter === "needs_reply") {
      next = next.filter((thread) => thread.needsReply);
    } else if (filter === "bookings") {
      next = next.filter((thread) => thread.kind === "booking");
    } else if (filter === "inquiries") {
      next = next.filter((thread) => thread.kind === "inquiry");
    }

    if (!searchQuery.trim()) return next;
    const lowerQuery = searchQuery.toLowerCase();
    return next.filter(
      (thread) =>
        thread.customerName.toLowerCase().includes(lowerQuery) ||
        thread.venueName.toLowerCase().includes(lowerQuery),
    );
  }, [threads, filter, searchQuery]);

  const sortedThreads = useMemo(() => {
    return [...filteredThreads].sort((a, b) => {
      const dateA = a.latestMessage
        ? new Date(a.latestMessage.created_at).getTime()
        : new Date(a.eventDate).getTime();
      const dateB = b.latestMessage
        ? new Date(b.latestMessage.created_at).getTime()
        : new Date(b.eventDate).getTime();
      return dateB - dateA;
    });
  }, [filteredThreads]);

  const selectedThread = threads.find(
    (thread) => thread.key === selectedThreadKey,
  );

  useEffect(() => {
    if (!selectedThread) return;
    let isMounted = true;
    setIsLoadingMessages(true);
    setBookingMessages([]);
    setInquiryMessages([]);

    const load =
      selectedThread.kind === "booking"
        ? import("@/src/features/booking/application/messages-actions").then(
            (mod) => mod.getBookingMessages(selectedThread.id),
          )
        : import(
            "@/src/features/venues/application/inquiry-messages-actions"
          ).then((mod) => mod.getVenueInquiryMessages(selectedThread.id));

    load
      .then((data) => {
        if (!isMounted) return;
        if (selectedThread.kind === "booking") {
          setBookingMessages(data as BookingMessage[]);
        } else {
          setInquiryMessages(data as VenueInquiryMessage[]);
        }
        setIsLoadingMessages(false);
      })
      .catch((error) => {
        console.error("Failed to load messages:", error);
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedThread]);

  function selectThread(threadKey: string) {
    setSelectedThreadKey(threadKey);
    router.replace(`/dashboard/coordinator/messages?thread=${threadKey}`, {
      scroll: false,
    });
  }

  function formatDate(iso: string) {
    const date = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function formatTimeAgo(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "";
    }
  }

  const filters: Array<{ id: FilterValue; label: string }> = [
    { id: "all", label: "All" },
    { id: "needs_reply", label: "Needs reply" },
    { id: "bookings", label: "Bookings" },
    { id: "inquiries", label: "Inquiries" },
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px] overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-sm shadow-slate-200/60">
      <div
        className={`flex w-full shrink-0 flex-col border-r border-[#e5e7eb] bg-[#f8fafc] md:w-[350px] lg:w-[400px] ${
          selectedThread ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-[#e5e7eb] bg-white p-5">
          <h2 className="mb-1 text-xl font-black tracking-tight text-[#0f172a]">
            Inbox
          </h2>
          <p className="mb-4 text-xs font-medium text-[#64748b]">
            Booking conversations and venue inquiries
          </p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] py-2 pl-9 pr-4 text-sm font-medium text-[#0f172a] placeholder-[#94a3b8] focus:border-[#1d4ed8] focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide transition ${
                  filter === item.id
                    ? "bg-[#1d4ed8] text-white"
                    : "border border-[#e5e7eb] bg-white text-[#64748b] hover:border-[#bfdbfe]"
                }`}
              >
                {item.label}
              </button>
            ))}
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
                Try another filter or search.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedThreads.map((thread) => {
                const isActive = thread.key === selectedThreadKey;
                return (
                  <button
                    key={thread.key}
                    type="button"
                    onClick={() => selectThread(thread.key)}
                    className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? "border-[#1d4ed8] bg-[#f8fbff] shadow-sm shadow-blue-900/5"
                        : "border-transparent bg-white hover:border-[#e5e7eb] hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate font-bold text-[#0f172a]">
                          {thread.customerName}
                        </div>
                        {thread.isUnread || thread.needsReply ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#1d4ed8]" />
                        ) : null}
                      </div>
                      {thread.latestMessage ? (
                        <div className="mt-0.5 shrink-0 text-[10px] font-semibold text-[#64748b]">
                          {formatTimeAgo(thread.latestMessage.created_at)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#1d4ed8]">
                        {thread.kind === "booking" ? "Booking" : "Inquiry"}
                      </span>
                      {thread.needsReply ? (
                        <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#c2410c]">
                          Needs reply
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
                      <MapPin className="h-3 w-3 text-[#1d4ed8]" />
                      <span className="truncate">{thread.venueName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
                      <CalendarDays className="h-3 w-3 text-[#1d4ed8]" />
                      <span>{formatDate(thread.eventDate)}</span>
                      <span className="mx-1 h-1 w-1 rounded-full bg-[#cbd5e1]" />
                      <span className="capitalize">
                        {thread.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p
                      className={`mt-1 line-clamp-2 text-sm ${
                        isActive ? "text-[#1e293b]" : "text-[#64748b]"
                      }`}
                    >
                      {thread.latestMessage ? (
                        <>
                          <span className="mr-1 font-semibold text-[#0f172a]">
                            {thread.latestMessage.sender_role === "venue_team"
                              ? "You:"
                              : `${thread.customerName}:`}
                          </span>
                          {thread.latestMessage.message}
                        </>
                      ) : (
                        <span className="italic text-[#94a3b8]">
                          No messages yet.
                        </span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        className={`relative flex flex-1 flex-col bg-white ${
          selectedThread ? "flex" : "hidden md:flex"
        }`}
      >
        {!selectedThread ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8fafc]/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#e5e7eb] bg-white shadow-sm">
              <Inbox className="h-6 w-6 text-[#94a3b8]" />
            </div>
            <h3 className="mt-5 text-base font-black text-[#0f172a]">
              Your messages
            </h3>
            <p className="mt-2 max-w-[280px] text-center text-sm font-medium text-[#64748b]">
              Select a booking chat or venue inquiry to reply to customers.
            </p>
          </div>
        ) : isLoadingMessages ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e5e7eb] border-t-[#1d4ed8]" />
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center border-b border-[#e5e7eb] bg-white p-3 md:hidden">
              <button
                type="button"
                onClick={() => setSelectedThreadKey(null)}
                className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm font-bold text-[#475569] shadow-sm hover:bg-[#f8fafc]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Inbox
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6">
              {selectedThread.kind === "booking" ? (
                <BookingConversation
                  bookingId={selectedThread.id}
                  initialMessages={bookingMessages}
                  currentUserId={currentUserId}
                  currentRole="venue_owner"
                  isReadOnly={false}
                  counterpartLabel="the customer"
                  header={{
                    role: "venue_owner",
                    customerName: selectedThread.customerName,
                    serviceName: selectedThread.serviceName,
                    inquiryRef: `Booking #${selectedThread.id.substring(0, 8)}`,
                    eventType: "Event",
                    eventDate: formatDate(selectedThread.eventDate),
                    venueName: selectedThread.venueName,
                    venueLink: selectedThread.venueSlug
                      ? `/venues/${selectedThread.venueSlug}`
                      : undefined,
                    statusLabel: selectedThread.status.replace(/_/g, " "),
                  }}
                />
              ) : (
                <VenueInquiryConversation
                  inquiryId={selectedThread.id}
                  initialMessages={inquiryMessages}
                  currentUserId={currentUserId}
                  isReadOnly={selectedThread.status === "closed"}
                  customerName={selectedThread.customerName}
                  venueName={selectedThread.venueName}
                  venueLink={
                    selectedThread.venueSlug
                      ? `/venues/${selectedThread.venueSlug}`
                      : undefined
                  }
                  statusLabel={selectedThread.status.replace(/_/g, " ")}
                  counterpartLabel="the customer"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
