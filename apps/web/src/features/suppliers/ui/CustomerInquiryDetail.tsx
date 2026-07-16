"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageSquare,
  ShieldCheck,
  TicketCheck,
  Users,
  CreditCard,
  XCircle,
  Loader2,
  Info,
} from "lucide-react";
import {
  CustomerCard,
  CustomerLinkButton,
  CustomerPageHeader,
  CustomerStatusBadge,
} from "@/src/components/customer/CustomerUI";
import {
  acceptSupplierQuoteAction,
  declineSupplierQuoteAction,
  sendCustomerInquiryMessageAction,
} from "../application/actions";
import { buildInquiryTimeline, canCustomerActOnQuote, getInquiryDisplayStatus } from "../application/customer-inquiry.logic";
import { formatResponseTime } from "../utils/supplier-format";
import { InquiryConversation } from "./InquiryConversation";

function formatCurrency(value?: number | null) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "Pending quote";
  }
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

function formatTime(timeString?: string | null) {
  if (!timeString) return "Time pending";
  const [hours, minutes] = timeString.split(":");
  if (!hours || !minutes) return timeString;
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function CustomerInquiryDetail({
  inquiry,
  messages,
  quote,
  isPreviewMode = false,
}: {
  inquiry: any;
  messages: any[];
  quote: any;
  isPreviewMode?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const supplier = inquiry.supplier_profiles;
  const service = inquiry.supplier_services;
  const booking = inquiry.bookings;
  const venue = booking?.venues;
  const supplierImage =
    supplier?.profile_image_url ||
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80";
  const displayStatus = getInquiryDisplayStatus(inquiry.status, quote?.status);
  const proposalStatus = quote
    ? getInquiryDisplayStatus(null, quote.status)
    : null;
  const timeline = buildInquiryTimeline(inquiry, messages, quote);
  const canActOnQuote = canCustomerActOnQuote(quote);
  const conversationClosed =
    inquiry.status === "closed" ||
    ["accepted", "declined", "withdrawn", "expired"].includes(quote?.status);

  const handleAction = (
    actionFn:
      typeof acceptSupplierQuoteAction | typeof declineSupplierQuoteAction,
    label: "accept" | "decline",
  ) => {
    if (!quote?.id || isPreviewMode) return;
    const confirmed = window.confirm(
      label === "accept"
        ? `Accept this Service Proposal from ${supplier?.business_name ?? "this supplier"} for ${formatCurrency(quote.total)}?`
        : `Decline this Service Proposal from ${supplier?.business_name ?? "this supplier"}?`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await actionFn({ quoteId: quote.id });
      if (result.error) {
        setError(result.error.message);
      } else {
        router.refresh();
      }
    });
  };

  const handleSendMessage = (formData: FormData) => {
    const message = formData.get("message") as string;
    if (!message?.trim() || conversationClosed) return;

    startTransition(async () => {
      const result = await sendCustomerInquiryMessageAction({
        inquiryId: inquiry.id,
        message: message.trim(),
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        const form = document.getElementById("chat-form") as HTMLFormElement;
        form?.reset();
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/bookings?view=suppliers"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Supplier Inquiries
        </Link>

        <CustomerPageHeader
          title={supplier?.business_name ?? "Supplier"}
          description={`Inquiry for: ${service?.name ?? "General Inquiry"} - Submitted ${formatDate(inquiry.created_at)}`}
          action={
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
                {displayStatus.label}
              </span>
              {proposalStatus && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-violet-700">
                  {proposalStatus.label}
                </span>
              )}
            </div>
          }
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {inquiry.status === "declined" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-black text-amber-900">Inquiry declined</h3>
            <p className="mt-1 text-sm font-semibold text-amber-700">
              The supplier was unable to continue with this request. You can
              still review the details and conversation below.
            </p>
            {inquiry.decline_reason && (
              <p className="mt-2 rounded-xl bg-white/50 p-3 text-sm font-medium text-amber-900">
                Reason: {inquiry.decline_reason}
              </p>
            )}
          </div>
        )}

        {inquiry.status === "cancelled" && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-black text-slate-900">Inquiry cancelled</h3>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              This inquiry is closed, but its messages and service proposal
              remain available for your records.
            </p>
          </div>
        )}

        {inquiry.status === "completed" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="font-black text-emerald-900">Service completed</h3>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              This supplier engagement has been completed.
            </p>
          </div>
        )}

        {quote?.status === "expired" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-black text-amber-900">
              Service Proposal expired
            </h3>
            <p className="mt-1 text-sm font-semibold text-amber-700">
              This proposal can no longer be accepted, but its pricing and terms
              remain available.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            
            <section className="space-y-4">
              <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Supplier Information
              </h3>
              <div className="flex gap-4 items-center">
                <img
                  src={supplierImage}
                  alt={supplier?.business_name ?? "Supplier"}
                  className="h-16 w-16 rounded-full object-cover border border-[#E5E7EB]"
                />
                <div>
                  <h4 className="text-lg font-black tracking-[-0.02em] text-slate-950">
                    {supplier?.business_name ?? "Supplier"}
                  </h4>
                  <p className="text-sm font-medium text-slate-500">
                    {supplier?.categories?.name || "Professional Services"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <CustomerLinkButton
                  href={`/suppliers/${supplier?.slug}`}
                  tone="secondary"
                >
                  View Supplier Profile
                </CustomerLinkButton>
              </div>
            </section>

            <hr className="border-t border-[#E5E7EB]" />

            {booking && (
              <>
                <section className="space-y-4">
                  <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                    Linked Event Details
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <CustomerStatusBadge icon={CalendarDays}>
                        Event Date
                      </CustomerStatusBadge>
                      <p className="mt-3 text-lg font-black text-slate-950">
                        {formatDate(
                          inquiry.event_date_snapshot ?? booking.event_date,
                        )}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {formatTime(
                          inquiry.event_start_time_snapshot ??
                            booking.event_start_time,
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <CustomerStatusBadge icon={MapPin}>
                        Venue
                      </CustomerStatusBadge>
                      <p className="mt-3 text-lg font-black text-slate-950">
                        {inquiry.venue_name_snapshot ?? venue?.name ?? "Venue"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {inquiry.location_snapshot ??
                          (venue?.city
                            ? `${venue.city}, ${venue.province}`
                            : "Location pending")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <CustomerStatusBadge icon={Users}>
                        Guests
                      </CustomerStatusBadge>
                      <p className="mt-3 text-lg font-black text-slate-950">
                        {inquiry.guest_count_snapshot ??
                          booking.guest_count ??
                          "Not specified"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 flex flex-col justify-center">
                      <CustomerLinkButton
                        href={`/bookings/${booking.id}`}
                        tone="secondary"
                      >
                        View Venue Booking
                      </CustomerLinkButton>
                    </div>
                  </div>
                </section>
                <hr className="border-t border-[#E5E7EB]" />
              </>
            )}

            <section className="space-y-4">
              <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Service Proposal
              </h3>
              {quote ? (
                <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-black tracking-[-0.02em] text-[#1D4ED8]">
                        {quote.title || "Service Proposal"}
                      </h4>
                      {quote.service_description && (
                        <p className="mt-2 text-sm font-medium leading-relaxed text-[#1E40AF]">
                          {quote.service_description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="text-lg font-black text-[#1E3A8A]">
                        {formatCurrency(quote.total)}
                      </p>
                      <p className="text-xs font-semibold text-[#3B82F6]">
                        Proposed total price
                      </p>
                    </div>
                  </div>
                  
                  {(quote.supplier_quote_items as any[])?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200/50">
                       <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#1E40AF] mb-3">
                         Line Items
                       </h4>
                       <div className="space-y-3">
                         {(quote.supplier_quote_items as any[])?.map((item, index) => (
                           <div
                             key={index}
                             className="flex justify-between items-start gap-4"
                           >
                             <div>
                               <p className="text-sm font-bold text-[#1E3A8A]">
                                 {item.description}
                               </p>
                               {item.quantity > 1 && (
                                 <p className="text-xs font-medium text-[#1E40AF]">
                                   {item.quantity} ×{" "}
                                   {formatCurrency(item.unit_price)}
                                 </p>
                               )}
                             </div>
                             <p className="text-sm font-bold text-[#1E3A8A] shrink-0">
                               {formatCurrency(item.amount)}
                             </p>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                  {quote.terms && (
                    <div className="mt-4 pt-4 border-t border-blue-200/50">
                      <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#1E40AF] mb-2">
                        Terms & Conditions
                      </h4>
                      <p className="text-xs font-medium text-[#1E40AF] whitespace-pre-wrap">
                        {quote.terms}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-5 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <h4 className="text-base font-bold text-slate-900">
                    No service proposal yet
                  </h4>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    The supplier may send a service proposal after reviewing your inquiry.
                  </p>
                </div>
              )}
            </section>

            <hr className="border-t border-[#E5E7EB]" />

            <section className="h-[600px]">
              <InquiryConversation
                currentUserId={inquiry.customer_id}
                role="customer"
                messages={messages}
                originalRequest={{
                  message: inquiry.message + (inquiry.special_requirements ? `\n\nSpecial Requirements:\n${inquiry.special_requirements}` : ''),
                  createdAt: inquiry.created_at,
                }}
                header={{
                  role: "customer",
                  supplierName: supplier?.business_name,
                  supplierLogo: supplierImage,
                  supplierSlug: supplier?.slug,
                  serviceName: service?.name,
                  inquiryRef: `INQ-${inquiry.id.slice(0, 6).toUpperCase()}`,
                  eventType: inquiry.event_type || "Event",
                  eventDate: formatDate(inquiry.event_date_snapshot ?? booking?.event_date),
                  venueName: inquiry.venue_name_snapshot ?? venue?.name,
                  venueLink: booking ? `/bookings/${booking.id}` : undefined,
                  statusLabel: displayStatus.label,
                }}
                isReadOnly={conversationClosed}
                onSendMessage={async (formData) => {
                  const message = formData.get("message") as string;
                  return sendCustomerInquiryMessageAction({
                    inquiryId: inquiry.id,
                    message,
                  });
                }}
              />
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[9.5rem]">
            {canActOnQuote && (
              <div className="flex flex-col gap-5 rounded-[24px] border border-[#BFDBFE] bg-white p-6 shadow-sm shadow-blue-200/50">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  Next Step
                </h2>
                <div className="grid gap-3">
                  <button
                    onClick={() =>
                      handleAction(acceptSupplierQuoteAction, "accept")
                    }
                    disabled={isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 h-12 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept Proposal
                  </button>
                  <button
                    onClick={() =>
                      handleAction(declineSupplierQuoteAction, "decline")
                    }
                    disabled={isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white border border-[#E5E7EB] px-5 h-12 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/60">
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                Payment Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Total Amount</span>
                  <span className="font-bold text-slate-950">
                    {formatCurrency(quote?.total)}
                  </span>
                </div>
                {quote?.valid_until && quote.status === "sent" && (
                  <div className="flex justify-between text-sm font-medium text-slate-600">
                    <span>Valid Until</span>
                    <span className="font-bold text-slate-950">
                      {formatDate(quote.valid_until)}
                    </span>
                  </div>
                )}
              </div>
              
              <hr className="border-t border-[#E5E7EB]" />
              
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status Timeline
                </h3>
                <div className="grid gap-0">
                  {timeline.length > 0 ? (
                    timeline.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex gap-4 border-l-2 border-[#DBEAFE] pb-6 last:border-transparent last:pb-0"
                      >
                        <span className="-ml-[13px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#2563EB] text-white">
                          <Clock3 className="h-3 w-3" />
                        </span>
                        <div className="-mt-1.5">
                          <p className="text-sm font-black capitalize text-slate-950">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            {formatDate(item.date)}
                          </p>
                          {item.description && (
                            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-600">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-semibold text-slate-500">
                      No timeline updates yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
