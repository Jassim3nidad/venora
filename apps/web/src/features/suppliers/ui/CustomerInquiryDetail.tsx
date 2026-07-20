"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  ReceiptText,
  Store,
  Users,
  XCircle,
} from "lucide-react";
import {
  CustomerCard,
  CustomerLinkButton,
  CustomerStatusBadge,
} from "@/src/components/customer/CustomerUI";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@venora/ui";
import {
  acceptSupplierQuoteAction,
  declineSupplierQuoteAction,
  sendCustomerInquiryMessageAction,
} from "../application/actions";
import {
  buildInquiryTimeline,
  canCustomerActOnQuote,
  getInquiryDisplayStatus,
  type CustomerInquiryTone,
} from "../application/customer-inquiry.logic";
import { formatResponseTime } from "../utils/supplier-format";
import { InquiryConversation } from "./InquiryConversation";

type QuoteAction = "accept" | "decline";

const statusToneClasses: Record<CustomerInquiryTone, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-red-200 bg-red-50 text-red-700",
  gray: "border-slate-200 bg-slate-100 text-slate-600",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isFiniteAmount(value?: number | string | null) {
  return (
    value !== null && value !== undefined && Number.isFinite(Number(value))
  );
}

function formatCurrency(value?: number | string | null) {
  if (!isFiniteAmount(value)) {
    return "Pending quote";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return "Date pending";
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

function formatTimelineDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

function humanizeStatus(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getQuoteItems(quote: any) {
  const items = quote?.supplier_quote_items;
  return Array.isArray(items) ? items : [];
}

function formatLineItemAmount(
  item: any,
  quoteTotal: number | string | null | undefined,
  itemCount: number,
) {
  const calculatedAmount = isFiniteAmount(item?.amount)
    ? item.amount
    : isFiniteAmount(item?.quantity) && isFiniteAmount(item?.unit_price)
      ? Number(item.quantity) * Number(item.unit_price)
      : null;

  if (isFiniteAmount(calculatedAmount)) {
    return formatCurrency(calculatedAmount);
  }

  if (isFiniteAmount(quoteTotal) && itemCount === 1) {
    return formatCurrency(quoteTotal as number);
  }

  if (isFiniteAmount(quoteTotal)) {
    return "Included";
  }

  return "Pending quote";
}

function StatusPill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: CustomerInquiryTone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em]",
        statusToneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

function QuoteActionButtons({
  isPending,
  onChoose,
  layout = "stacked",
}: {
  isPending: boolean;
  onChoose: (action: QuoteAction) => void;
  layout?: "stacked" | "row";
}) {
  return (
    <div className={cx("grid gap-3", layout === "row" && "sm:grid-cols-2")}>
      <button
        type="button"
        onClick={() => onChoose("accept")}
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Accept Proposal
      </button>
      <button
        type="button"
        onClick={() => onChoose("decline")}
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        Decline
      </button>
    </div>
  );
}

function QuoteActionDialog({
  action,
  isPending,
  supplierName,
  serviceName,
  totalAmount,
  onClose,
  onConfirm,
}: {
  action: QuoteAction | null;
  isPending: boolean;
  supplierName: string;
  serviceName: string;
  totalAmount: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isAccept = action === "accept";

  return (
    <Dialog
      open={Boolean(action)}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-[-0.02em] text-slate-950">
            {isAccept ? "Accept this proposal?" : "Decline this proposal?"}
          </DialogTitle>
          <DialogDescription className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <span className="block">
              {isAccept
                ? "You are about to accept the supplier proposal below."
                : "You are about to decline the supplier proposal below."}
            </span>
            <span className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="block font-bold text-slate-950">
                {supplierName}
              </span>
              <span className="block">{serviceName}</span>
              <span className="mt-1 block font-bold text-slate-950">
                {totalAmount}
              </span>
            </span>
            <span className="block">
              {isAccept
                ? "The supplier will be notified and this proposal will move forward for your event."
                : "The supplier will be notified. You can still review the inquiry history afterward."}
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-3 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            autoFocus
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cx(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow-sm transition disabled:opacity-50 sm:w-auto",
              isAccept
                ? "bg-[#2563EB] hover:bg-[#1D4ED8]"
                : "bg-red-600 hover:bg-red-700",
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isAccept ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isAccept ? "Yes, accept" : "Yes, decline"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const [pendingAction, setPendingAction] = useState<QuoteAction | null>(null);

  const supplier = inquiry.supplier_profiles;
  const service = inquiry.supplier_services;
  const booking = inquiry.bookings;
  const venue = booking?.venues;
  const supplierName = supplier?.business_name ?? "Supplier";
  const serviceName = service?.name ?? "General inquiry";
  const supplierImage =
    supplier?.profile_image_url ||
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80";
  const supplierCategory =
    supplier?.supplier_categories?.name ||
    supplier?.categories?.name ||
    "Professional Services";
  const responseTime = isFiniteAmount(supplier?.response_time_hours)
    ? formatResponseTime(Number(supplier.response_time_hours))
    : null;
  const accreditationLabel = humanizeStatus(supplier?.accreditation_status);
  const displayStatus = getInquiryDisplayStatus(inquiry.status, quote?.status);
  const timeline = buildInquiryTimeline(inquiry, messages, quote).filter(
    (item) => item.label && formatTimelineDate(item.at),
  );
  const quoteItems = getQuoteItems(quote);
  const canActOnQuote = canCustomerActOnQuote(quote);
  const quoteTotal = formatCurrency(quote?.total);
  const quoteStatus = String(quote?.status ?? "").toLowerCase();
  const conversationClosed =
    inquiry.status === "closed" ||
    ["accepted", "declined", "withdrawn", "expired"].includes(quoteStatus);
  const eventDate = inquiry.event_date_snapshot ?? booking?.event_date;
  const eventTime =
    inquiry.event_start_time_snapshot ?? booking?.event_start_time;
  const guestCount =
    inquiry.guest_count_snapshot ?? booking?.guest_count ?? "Not specified";
  const venueName = inquiry.venue_name_snapshot ?? venue?.name ?? "Venue";
  const venueLocation =
    inquiry.location_snapshot ??
    (venue?.city ? `${venue.city}, ${venue.province}` : "Location pending");

  const openActionDialog = (action: QuoteAction) => {
    if (!quote?.id || isPreviewMode) return;
    setError(null);
    setPendingAction(action);
  };

  const handleConfirmAction = () => {
    if (!quote?.id || !pendingAction || isPreviewMode) return;
    const actionFn =
      pendingAction === "accept"
        ? acceptSupplierQuoteAction
        : declineSupplierQuoteAction;

    setError(null);
    startTransition(async () => {
      const result = await actionFn({ quoteId: quote.id });
      if (result.error) {
        setError(result.error.message);
        setPendingAction(null);
        return;
      }

      setPendingAction(null);
      router.refresh();
    });
  };

  return (
    <div className="bg-[#F8FAFC] font-sans text-[#111827]">
      <div
        className={cx(
          "mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        )}
      >
        <Link
          href="/bookings?view=suppliers"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Supplier Inquiries
        </Link>

        <CustomerCard className="p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusPill
                  label={displayStatus.label}
                  tone={displayStatus.tone}
                />
                {quote?.valid_until && canActOnQuote ? (
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    Valid until {formatDate(quote.valid_until)}
                  </span>
                ) : null}
              </div>
              <h1 className="max-w-3xl break-words text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 md:text-4xl">
                {supplierName}
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280] sm:text-base">
                Inquiry for{" "}
                <span className="font-bold text-slate-800">{serviceName}</span>
                {" - "}submitted {formatDate(inquiry.created_at)}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Event date
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {formatDate(eventDate)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Venue
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">
                    {venueName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Guests
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {guestCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#DBEAFE] bg-[#EFF6FF] p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                Proposal amount
              </p>
              <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                {quoteTotal}
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-[#1D4ED8]">
                Review the supplier proposal and decide if it fits your event.
              </p>
              {canActOnQuote ? (
                <div className="mt-4 lg:hidden">
                  <QuoteActionButtons
                    isPending={isPending}
                    onChoose={openActionDialog}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </CustomerCard>

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

        {quoteStatus === "expired" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-black text-amber-900">
              Service proposal expired
            </h3>
            <p className="mt-1 text-sm font-semibold text-amber-700">
              This proposal can no longer be accepted, but its pricing and terms
              remain available.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <CustomerCard className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <img
                    src={supplierImage}
                    alt={supplierName}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-[#E5E7EB] object-cover"
                  />
                  <div className="min-w-0">
                    <CustomerStatusBadge icon={Store} className="mb-2">
                      Supplier
                    </CustomerStatusBadge>
                    <h2 className="truncate text-lg font-black tracking-[-0.02em] text-slate-950">
                      {supplierName}
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                      {supplierCategory} - {serviceName}
                    </p>
                  </div>
                </div>
                {supplier?.slug ? (
                  <CustomerLinkButton
                    href={`/suppliers/${supplier.slug}`}
                    tone="secondary"
                    className="w-full sm:w-auto"
                  >
                    View Supplier Profile
                  </CustomerLinkButton>
                ) : null}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {responseTime ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    <Clock3 className="mb-2 h-4 w-4 text-[#2563EB]" />
                    Responds {responseTime.toLowerCase()}
                  </div>
                ) : null}
                {accreditationLabel ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    <BadgeCheck className="mb-2 h-4 w-4 text-[#2563EB]" />
                    {accreditationLabel}
                  </div>
                ) : null}
              </div>
            </CustomerCard>

            {booking && (
              <CustomerCard className="p-5 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CustomerStatusBadge icon={CalendarDays} className="mb-2">
                      Linked event
                    </CustomerStatusBadge>
                    <h2 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                      Event Details
                    </h2>
                  </div>
                  <CustomerLinkButton
                    href={`/bookings/${booking.id}`}
                    tone="secondary"
                    className="w-full sm:w-auto"
                  >
                    View Venue Booking
                  </CustomerLinkButton>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <CalendarDays className="mb-3 h-5 w-5 text-[#2563EB]" />
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Date and time
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {formatDate(eventDate)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatTime(eventTime)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:col-span-1">
                    <MapPin className="mb-3 h-5 w-5 text-[#2563EB]" />
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Venue
                    </p>
                    <p className="mt-1 line-clamp-2 text-lg font-black text-slate-950">
                      {venueName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">
                      {venueLocation}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <Users className="mb-3 h-5 w-5 text-[#2563EB]" />
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Guests
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {guestCount}
                    </p>
                  </div>
                </div>
              </CustomerCard>
            )}

            <CustomerCard className="p-5 sm:p-6">
              <div className="mb-5">
                <div>
                  <CustomerStatusBadge icon={ReceiptText} className="mb-2">
                    Service proposal
                  </CustomerStatusBadge>
                  <h2 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                    Proposal Details
                  </h2>
                </div>
              </div>

              {quote ? (
                <div className="rounded-3xl border border-[#DBEAFE] bg-[#EFF6FF] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-black tracking-[-0.02em] text-[#1D4ED8]">
                        {quote.title || `${serviceName} Proposal`}
                      </h3>
                      {quote.service_description ? (
                        <p className="mt-2 text-sm font-medium leading-6 text-[#1E40AF]">
                          {quote.service_description}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 rounded-2xl bg-white/70 px-4 py-3 sm:text-right">
                      <p className="text-lg font-black text-[#1E3A8A]">
                        {quoteTotal}
                      </p>
                      <p className="text-xs font-semibold text-[#3B82F6]">
                        Proposed total
                      </p>
                    </div>
                  </div>

                  {quoteItems.length > 0 ? (
                    <div className="mt-5 border-t border-blue-200/60 pt-4">
                      <h4 className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#1E40AF]">
                        Line items
                      </h4>
                      <div className="space-y-3">
                        {quoteItems.map((item, index) => (
                          <div
                            key={item.id ?? index}
                            className="flex items-start justify-between gap-4 rounded-2xl bg-white/55 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-bold text-[#1E3A8A]">
                                {item.description || serviceName}
                              </p>
                              {Number(item.quantity) > 1 &&
                              isFiniteAmount(item.unit_price) ? (
                                <p className="text-xs font-medium text-[#1E40AF]">
                                  {item.quantity} x{" "}
                                  {formatCurrency(item.unit_price)}
                                </p>
                              ) : null}
                            </div>
                            <p className="shrink-0 text-sm font-bold text-[#1E3A8A]">
                              {formatLineItemAmount(
                                item,
                                quote.total,
                                quoteItems.length,
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {quote.terms ? (
                    <div className="mt-5 border-t border-blue-200/60 pt-4">
                      <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#1E40AF]">
                        Terms and conditions
                      </h4>
                      <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-[#1E40AF]">
                        {quote.terms}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                  <h3 className="text-base font-black text-slate-900">
                    No service proposal yet
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    The supplier may send a service proposal after reviewing
                    your inquiry.
                  </p>
                </div>
              )}
            </CustomerCard>

            <section>
              <InquiryConversation
                currentUserId={inquiry.customer_id}
                role="customer"
                messages={messages}
                originalRequest={{
                  message:
                    inquiry.message +
                    (inquiry.special_requirements
                      ? `\n\nSpecial Requirements:\n${inquiry.special_requirements}`
                      : ""),
                  createdAt: inquiry.created_at,
                }}
                header={{
                  role: "customer",
                  supplierName,
                  supplierLogo: supplierImage,
                  supplierSlug: supplier?.slug,
                  serviceName,
                  inquiryRef: `INQ-${inquiry.id.slice(0, 6).toUpperCase()}`,
                  eventType: inquiry.event_type || "Event",
                  eventDate: formatDate(eventDate),
                  venueName,
                  venueLink: booking ? `/bookings/${booking.id}` : undefined,
                  statusLabel: displayStatus.label,
                }}
                compact
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
            <CustomerCard className="p-5">
              <div>
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  Proposal Summary
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  Review the quote before making a decision.
                </p>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                  Total amount
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {quoteTotal}
                </p>
                {quote?.valid_until ? (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Valid until {formatDate(quote.valid_until)}
                  </p>
                ) : null}
              </div>

              {canActOnQuote ? (
                <div className="mt-5 hidden lg:block">
                  <QuoteActionButtons
                    isPending={isPending}
                    onChoose={openActionDialog}
                  />
                </div>
              ) : null}
            </CustomerCard>

            {timeline.length > 0 ? (
              <CustomerCard className="p-5">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  Status Timeline
                </h2>
                <div className="mt-5 grid gap-0">
                  {timeline.map((item, index) => (
                    <div
                      key={`${item.label}-${item.at}-${index}`}
                      className="flex gap-4 border-l-2 border-[#DBEAFE] pb-5 last:border-transparent last:pb-0"
                    >
                      <span className="-ml-[13px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#2563EB] text-white">
                        <Clock3 className="h-3 w-3" />
                      </span>
                      <div className="-mt-1.5">
                        <p className="text-sm font-black text-slate-950">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          {formatTimelineDate(item.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CustomerCard>
            ) : null}

            <CustomerCard className="p-5">
              <div className="flex gap-3">
                <MessageSquare className="mt-1 h-5 w-5 shrink-0 text-[#2563EB]" />
                <div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                    Conversation
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    Messages remain attached to this supplier inquiry for your
                    records.
                  </p>
                </div>
              </div>
            </CustomerCard>
          </aside>
        </div>
      </div>

      <QuoteActionDialog
        action={pendingAction}
        isPending={isPending}
        supplierName={supplierName}
        serviceName={serviceName}
        totalAmount={quoteTotal}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
