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
  XCircle,
  Loader2,
} from "lucide-react";
import { acceptSupplierQuoteAction, declineSupplierQuoteAction, sendCustomerInquiryMessageAction } from "../application/actions";

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
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
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function CustomerInquiryDetail({ inquiry, messages, quote, isPreviewMode = false }: { inquiry: any; messages: any[]; quote: any; isPreviewMode?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const supplier = inquiry.supplier_profiles;
  const supplierImage = supplier?.profile_image_url || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80";

  const handleAction = (actionFn: typeof acceptSupplierQuoteAction | typeof declineSupplierQuoteAction) => {
    if (!quote?.id || isPreviewMode) return;
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
    if (!message?.trim()) return;
    
    startTransition(async () => {
      const result = await sendCustomerInquiryMessageAction({ inquiryId: inquiry.id, message: message.trim() });
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
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        href="/account/inquiries"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inquiries
      </Link>

      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70">
        <div className="grid gap-0 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="relative h-48 lg:h-full">
            <img
              src={supplierImage}
              alt={supplier?.business_name ?? "Supplier"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Supplier
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
                {inquiry.status}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-black text-[#111827] sm:text-3xl">
              {supplier?.business_name ?? "Supplier"}
            </h1>
            <p className="mt-1 text-sm font-bold text-[#6B7280]">
              Inquiry for: {inquiry.supplier_services?.name ?? "General Inquiry"}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#4B5563]">
                <MapPin className="h-4 w-4 text-[#2563EB]" />
                {inquiry.location_snapshot || inquiry.event_location || "Location unavailable"}
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#4B5563]">
                <CalendarDays className="h-4 w-4 text-[#2563EB]" />
                {formatDate(inquiry.event_date_snapshot || inquiry.event_date)}
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#4B5563]">
                <TicketCheck className="h-4 w-4 text-[#2563EB]" />
                {(inquiry.guest_count_snapshot || inquiry.guest_count || 0).toLocaleString("en-PH")} guests
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#4B5563]">
                <Clock3 className="h-4 w-4 text-[#2563EB]" />
                Sent {formatDate(inquiry.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Service Proposal Section */}
        {quote && (
          <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/70">
            <h2 className="flex items-center gap-2 text-lg font-black text-[#111827]">
              <FileText className="h-5 w-5 text-[#2563EB]" />
              Service Proposal
            </h2>
            
            <div className="mt-4 flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div>
                <p className="font-bold text-[#111827]">{quote.title}</p>
                <p className="text-sm font-medium text-[#6B7280]">
                  Status: <span className="uppercase text-[#2563EB]">{quote.status}</span>
                </p>
                {quote.valid_until && (
                  <p className="text-sm font-medium text-[#6B7280]">
                    Valid until: {formatDate(quote.valid_until)}
                  </p>
                )}
              </div>
            </div>

            {quote.service_description && (
              <div className="mt-4 border-b border-[#E5E7EB] pb-4">
                <p className="whitespace-pre-wrap text-sm text-[#4B5563]">
                  {quote.service_description}
                </p>
              </div>
            )}

            <div className="mt-4 space-y-3 border-b border-[#E5E7EB] pb-4">
              {quote.supplier_quote_items?.map((item: any) => (
                <div key={item.id || item.sort_order} className="flex justify-between text-sm">
                  <span className="font-medium text-[#4B5563]">
                    {item.quantity}x {item.description}
                  </span>
                  <span className="font-bold text-[#111827]">{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-b border-[#E5E7EB] pb-4">
              <div className="flex justify-between text-sm font-semibold text-[#6B7280]">
                <span>Subtotal</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {Number(quote.additional_fees) > 0 && (
                <div className="flex justify-between text-sm font-semibold text-[#6B7280]">
                  <span>Additional Fees</span>
                  <span>{formatCurrency(quote.additional_fees)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between text-lg font-black text-[#111827]">
                <span>Total</span>
                <span className="text-[#2563EB]">{formatCurrency(quote.total)}</span>
              </div>
            </div>

            {quote.terms && (
              <div className="mt-4 border-b border-[#E5E7EB] pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Terms and Conditions</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#4B5563]">
                  {quote.terms}
                </p>
              </div>
            )}

            {quote.status === "sent" && !isPreviewMode && (
              <div className="mt-6">
                {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(acceptSupplierQuoteAction)}
                    disabled={isPending}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-sm font-extrabold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Accept Proposal
                  </button>
                  <button
                    onClick={() => handleAction(declineSupplierQuoteAction)}
                    disabled={isPending}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#111827] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Decline
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {!quote && (
          <section className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <FileText className="h-6 w-6 text-[#9CA3AF]" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#111827]">No Proposal Yet</h3>
            <p className="mt-1 text-sm font-medium text-[#6B7280]">
              The supplier will review your request and send a service proposal if they are available.
            </p>
          </section>
        )}

        {/* Messages Section */}
        <section className="flex flex-col rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70">
          <div className="border-b border-[#E5E7EB] p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-[#111827]">
              <MessageSquare className="h-5 w-5 text-[#2563EB]" />
              Conversation
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#6B7280]">
              Chat with {supplier?.business_name}.
            </p>
          </div>
          
          <div className="flex max-h-[500px] flex-col gap-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-[#9CA3AF]">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg) => {
                const isCustomer = msg.sender_id === inquiry.customer_id;
                return (
                  <div key={msg.id} className={`flex w-full ${isCustomer ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ${
                        isCustomer
                          ? "bg-[#2563EB] text-white rounded-br-none"
                          : "bg-[#F3F4F6] text-[#111827] rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <span className={`mt-1 block text-[10px] font-bold ${isCustomer ? "text-blue-200" : "text-gray-400"}`}>
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="rounded-b-[28px] border-t border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <form 
              action={handleSendMessage}
              id="chat-form"
              className="flex gap-2"
            >
              <input
                type="text"
                name="message"
                placeholder="Type your message..."
                required
                className="flex-1 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
              <button
                type="submit"
                disabled={isPending}
                className="flex h-[46px] items-center justify-center rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
