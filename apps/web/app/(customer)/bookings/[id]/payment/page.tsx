import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BookingStatusBadge } from "@/src/features/booking/ui/booking-status-badge";
import type { BookingStatusValue } from "@/src/features/booking/domain/value-objects/booking-status.vo";
import "@/src/features/payments/infrastructure/register-gateways";
import { BookingPaymentClientUI } from "@/src/features/booking/ui/BookingPaymentClientUI";
import type {
  InvoiceRow,
  ReceiptRow,
  RefundRow,
} from "@/src/features/payments/types/payment.types";

export const metadata: Metadata = {
  title: "Payment | Venora",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value?: number | null) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "Pending";
  }
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "Not set";
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: includeTime ? "short" : undefined,
  }).format(date);
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) return "Payment deadline passed";
  if (diffHours < 24) return "Due in less than 24 hours";

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} remaining`;
}

export default async function BookingPaymentPage({ params }: Props) {
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=/bookings/${id}/payment`);

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id,
      status,
      event_date,
      total_amount,
      deposit_amount,
      payment_due_at,
      confirmed_at,
      venues ( name, slug ),
      transactions (
        id,
        amount,
        payment_provider,
        provider_reference,
        status,
        created_at,
        paid_at
      )
    `,
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();

  if (!booking) notFound();

  const [{ data: invoices }, { data: receipts }, { data: refunds }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("receipts")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("refunds")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const status = booking.status as BookingStatusValue;

  // Calculate remaining balance
  const totalAmount = Number(booking.total_amount) || 0;
  const depositAmount = Number(booking.deposit_amount) || 0;
  const remainingBalance = Math.max(0, totalAmount - depositAmount);
  const depositPercentage =
    totalAmount > 0 ? Math.round((depositAmount / totalAmount) * 100) : null;

  // Determine actual payment status
  const isPayable = status === "approved" || status === "payment_pending";
  const isPaid = ["confirmed", "completed", "reviewed"].includes(status);

  const transactions = Array.isArray(booking.transactions)
    ? booking.transactions
    : [];
  // Sort transactions latest first
  transactions.sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const activePendingTransaction = transactions.find(
    (t: any) => t.status === "pending",
  );
  const failedTransaction =
    !activePendingTransaction &&
    transactions.find((t: any) => t.status === "failed");
  const expiredTransaction =
    !activePendingTransaction &&
    transactions.find((t: any) => t.status === "expired");

  let paymentUiState:
    | "payable"
    | "pending_provider"
    | "paid"
    | "failed"
    | "expired"
    | "not_payable" = "not_payable";

  if (isPaid) {
    paymentUiState = "paid";
  } else if (activePendingTransaction) {
    paymentUiState = "pending_provider";
  } else if (isPayable) {
    if (failedTransaction) paymentUiState = "failed";
    else if (expiredTransaction) paymentUiState = "expired";
    else paymentUiState = "payable";
  }

  const isOverdue =
    booking.payment_due_at &&
    new Date(booking.payment_due_at).getTime() < Date.now();

  const venueName = Array.isArray(booking.venues)
    ? booking.venues[0]?.name
    : booking.venues?.name;
  const bookingRef = `VEN-${booking.id.split("-")[0].toUpperCase()}`;

  // Gather payment activity chronologically
  const activityItems = [
    ...(invoices || []).map((i: any) => ({
      type: "invoice",
      id: i.id,
      date: i.created_at,
      title: `Invoice ${i.invoice_number} issued`,
    })),
    ...transactions.map((t: any) => ({
      type: "transaction",
      id: t.id,
      date: t.created_at,
      amount: t.amount,
      status: t.status,
      provider: t.payment_provider,
      reference: t.provider_reference,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-[#F8FAFC] text-[#111827] min-h-screen pb-12">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* 1. Back to booking details */}
        <Link
          href={`/bookings/${id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to booking details
        </Link>

        {/* 2, 3, 4. Header & Context */}
        <div className="mt-2 grid gap-1">
          <p className="text-sm font-extrabold uppercase tracking-widest text-[#2563EB]">
            Secure payment
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-950">
            Pay your reservation deposit
          </h1>
          <p className="mt-2 text-base font-medium text-slate-600">
            {venueName}
          </p>
          <p className="text-sm text-slate-500">
            {formatDate(booking.event_date)} · Booking #{bookingRef}
          </p>
        </div>

        {/* 5. Booking-payment progress stepper */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm font-bold">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Booking approved
          </div>
          <div className="hidden sm:block text-slate-300">→</div>
          <div
            className={`flex items-center gap-2 ${isPaid ? "text-green-700" : paymentUiState === "pending_provider" ? "text-amber-700" : "text-[#2563EB]"}`}
          >
            {isPaid ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : paymentUiState === "pending_provider" ? (
              <Clock3 className="h-5 w-5" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-white text-[10px]">
                2
              </div>
            )}
            {paymentUiState === "pending_provider"
              ? "Payment processing"
              : isPaid
                ? "Deposit paid"
                : "Deposit payment"}
            {!isPaid && paymentUiState !== "pending_provider" && (
              <span className="ml-2 rounded bg-[#EFF6FF] px-2 py-0.5 text-xs text-[#1D4ED8]">
                Current
              </span>
            )}
          </div>
          <div className="hidden sm:block text-slate-300">→</div>
          <div
            className={`flex items-center gap-2 ${isPaid ? "text-green-700" : "text-slate-400"}`}
          >
            {isPaid ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-200 text-[10px]">
                3
              </div>
            )}
            Booking confirmed
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          {/* PRIMARY PAYMENT PANEL */}
          <div className="grid gap-8 rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-sm">
            {/* 6. Payment Summary */}
            <section>
              <h2 className="text-xl font-bold text-slate-950 mb-4">
                Payment summary
              </h2>
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <dt className="font-medium text-slate-600">Booking total</dt>
                  <dd className="font-bold text-slate-900 tabular-nums">
                    {formatCurrency(totalAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <dt className="font-bold text-slate-900">Deposit required</dt>
                  <dd className="font-bold text-[#2563EB] tabular-nums text-base">
                    {formatCurrency(depositAmount)}
                    {depositPercentage && (
                      <span className="ml-2 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        ({depositPercentage}%)
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-slate-600">
                    Remaining balance
                  </dt>
                  <dd className="font-bold text-slate-700 tabular-nums">
                    {formatCurrency(remainingBalance)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Due Date & Primary Action */}
            <section className="grid gap-5">
              {booking.payment_due_at && !isPaid && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    Payment due
                  </p>
                  <p className="text-base text-slate-700 mt-1">
                    {formatDate(booking.payment_due_at, true)}
                  </p>
                  <p
                    className={`text-sm mt-1 font-semibold ${isOverdue ? "text-red-600" : "text-amber-600"}`}
                  >
                    {formatRelativeTime(booking.payment_due_at)}
                  </p>
                </div>
              )}

              {isPaid ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <div className="flex items-center gap-3 text-green-800">
                    <CheckCircle2 className="h-6 w-6" />
                    <div>
                      <h3 className="font-bold">Deposit confirmed</h3>
                      <p className="text-sm mt-1 text-green-700">
                        Your reservation deposit has been received. View your
                        booking for the latest confirmation details.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <BookingPaymentClientUI
                  bookingId={id}
                  venueName={venueName || "venue"}
                  depositAmount={depositAmount}
                  formattedDeposit={formatCurrency(depositAmount)}
                  status={paymentUiState}
                  providerName={activePendingTransaction?.payment_provider}
                  providerReference={
                    activePendingTransaction?.provider_reference
                  }
                  startedAt={
                    activePendingTransaction?.created_at
                      ? formatDate(activePendingTransaction.created_at, true)
                      : undefined
                  }
                />
              )}

              {/* What happens next */}
              {!isPaid && paymentUiState !== "pending_provider" && (
                <div className="text-sm text-slate-600 mt-2">
                  <span className="font-bold text-slate-900">
                    What happens next?
                  </span>{" "}
                  After your deposit is confirmed, your booking will be reserved
                  and its status will change to Confirmed.
                </div>
              )}
            </section>

            {/* Security Reassurance */}
            {!isPaid && (
              <div className="flex items-center gap-3 pt-6 border-t border-slate-100 text-sm text-slate-600">
                <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0" />
                <p>
                  <span className="font-bold text-slate-700">
                    Secure payment through PayMongo.
                  </span>{" "}
                  You’ll be redirected to PayMongo to choose an available
                  payment method. Venora does not store your card details.
                </p>
              </div>
            )}
          </div>

          {/* SECONDARY PANEL */}
          <div className="grid gap-6">
            {/* 9. Billing documents */}
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950 mb-4">
                Billing documents
              </h2>

              {invoices && invoices.length > 0 ? (
                <div className="grid gap-3">
                  {invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0 last:pb-0"
                    >
                      <div className="flex gap-3">
                        <FileText className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="grid gap-1 text-sm">
                          <p className="font-bold text-slate-900">
                            Invoice {inv.invoice_number || "INV"}
                          </p>
                          <p className="text-slate-600">Reservation deposit</p>
                          <p className="text-slate-500">
                            {formatCurrency(inv.amount_due)} · Due{" "}
                            {formatDate(inv.due_date)}
                          </p>
                          {inv.hosted_invoice_url && (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2563EB] font-bold hover:underline mt-1"
                            >
                              View invoice
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No billing documents are available yet.
                </p>
              )}
            </section>

            {/* 10. Payment activity */}
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950 mb-4">
                Payment activity
              </h2>

              {activityItems.length > 0 ? (
                <div className="relative border-l border-slate-200 ml-3 pl-5 grid gap-6 py-2">
                  {activityItems.map((item, idx) => (
                    <div
                      key={`${item.type}-${item.id}-${idx}`}
                      className="relative"
                    >
                      <div
                        className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ring-1 ring-slate-200 ${item.status === "paid" ? "bg-green-500" : item.status === "failed" ? "bg-red-500" : "bg-slate-400"}`}
                      />
                      <p className="text-xs font-semibold text-slate-500">
                        {formatDate(item.date, true)}
                      </p>

                      {item.type === "invoice" ? (
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {item.title}
                        </p>
                      ) : (
                        <div className="mt-1 grid gap-1 text-sm">
                          <p className="font-bold text-slate-900">
                            {item.status === "paid"
                              ? "Deposit payment confirmed"
                              : item.status === "failed"
                                ? "Payment attempt failed"
                                : "Payment attempt started"}
                          </p>
                          <p className="text-slate-600">
                            {formatCurrency(item.amount)} through{" "}
                            {item.provider || "provider"}
                          </p>
                          {item.status === "pending" && (
                            <p className="text-amber-600 font-medium text-xs mt-0.5">
                              Status: Awaiting confirmation
                            </p>
                          )}
                          {item.status === "paid" && item.reference && (
                            <p className="text-slate-500 text-xs mt-0.5">
                              Reference: {item.reference}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No payment activity yet.
                </p>
              )}
            </section>

            {/* 11. Cancellation and refund policy */}
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950 mb-2">
                Cancellation & Refunds
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                Review the venue's policy on deposit refunds before completing
                your payment.
              </p>
              <Link
                href={`/venues/${booking.venues?.slug || ""}`}
                className="text-sm font-bold text-[#2563EB] hover:underline"
              >
                Review venue policy
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
