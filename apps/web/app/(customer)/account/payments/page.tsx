import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CreditCard, Receipt, ShieldCheck, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import "@/src/features/payments/infrastructure/register-gateways";
import { listAvailableProviders } from "@/src/features/payments/application/gateway-registry";
import type { PaymentProviderId } from "@/src/features/payments/types/payment.types";

export const metadata: Metadata = {
  title: "Billing & Payments",
};

export const dynamic = "force-dynamic";

const PROVIDER_DETAILS: Record<
  PaymentProviderId,
  { name: string; methods: string[]; note: string }
> = {
  paymongo: {
    name: "PayMongo",
    methods: ["Cards", "GCash", "GrabPay"],
    note: "Methods are selected on PayMongo's hosted checkout page.",
  },
  stripe: {
    name: "Stripe",
    methods: ["Cards"],
    note: "Not enabled unless a Stripe gateway is registered.",
  },
};

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-slate-100 text-slate-600 border-slate-200",
  partially_refunded: "bg-amber-50 text-amber-700 border-amber-200",
  succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

const PROVIDER_LABELS: Record<string, string> = {
  paymongo: "PayMongo",
  stripe: "Stripe",
};

function formatCurrency(value: number | null | undefined, currency = "PHP") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Pending";
  }
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return date.toLocaleDateString("en-PH", { dateStyle: "medium" });
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatType(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function BillingPage() {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const providers = listAvailableProviders();
  const activeProviderDetails = providers.map((provider) => ({
    id: provider,
    ...PROVIDER_DETAILS[provider],
  }));

  // 1. Fetch bookings for context
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, event_date, deposit_amount, status, venues(name, slug)")
    .eq("customer_id", user.id)
    .order("event_date", { ascending: true });

  if (bookingsError) {
    console.error("[account/billing] Bookings fetch error:", bookingsError.message);
  }

  const bookingRows = (bookings ?? []);
  const bookingIds = bookingRows.map((b: any) => b.id);
  const bookingById = new Map(bookingRows.map((b: any) => [b.id, b]));

  // Payable bookings
  const payableBookings = bookingRows.filter(
    (b: any) => b.status === "approved" || b.status === "payment_pending"
  ).slice(0, 5);

  let transactions: any[] = [];
  let refunds: any[] = [];
  let receipts: any[] = [];
  let invoices: any[] = [];
  let historyError: string | null = bookingsError?.message ?? null;

  if (bookingIds.length > 0) {
    const [txResult, rfResult, rcResult, invResult] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, booking_id, amount, currency, payment_provider, provider_reference, status, payment_kind, paid_at, failed_at, created_at")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("refunds")
        .select("id, booking_id, transaction_id, amount, currency, status, reason, payment_provider, provider_reference, processed_at, created_at")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("receipts")
        .select("id, receipt_number, transaction_id, booking_id")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, invoice_number, booking_id, issued_at")
        .eq("customer_id", user.id)
        .order("issued_at", { ascending: false })
    ]);

    for (const res of [txResult, rfResult, rcResult, invResult]) {
      if (res.error) {
        historyError = res.error.message;
        console.error("[account/billing] History error:", res.error.message);
      }
    }
    transactions = txResult.data ?? [];
    refunds = rfResult.data ?? [];
    receipts = rcResult.data ?? [];
    invoices = invResult.data ?? [];
  }

  const receiptByTxId = new Map(receipts.map((r) => [r.transaction_id, r]));
  const invoiceByBookingId = new Map<string, any>();
  for (const inv of invoices) {
    if (!invoiceByBookingId.has(inv.booking_id)) invoiceByBookingId.set(inv.booking_id, inv);
  }

  const transactionRows = transactions.map((tx) => {
    const b = bookingById.get(tx.booking_id) as any;
    const r = receiptByTxId.get(tx.id);
    const i = invoiceByBookingId.get(tx.booking_id);
    return {
      id: tx.id,
      bookingId: tx.booking_id,
      venueName: b?.venues?.name ?? "Venue booking",
      venueSlug: b?.venues?.slug ?? null,
      eventDate: b?.event_date ?? null,
      recordedAt: tx.paid_at ?? tx.failed_at ?? tx.created_at,
      amount: Number(tx.amount),
      currency: tx.currency ?? "PHP",
      provider: tx.payment_provider,
      reference: tx.provider_reference ?? tx.id,
      status: tx.status,
      type: tx.payment_kind ?? "payment",
      receiptNumber: r?.receipt_number ?? null,
      invoiceNumber: i?.invoice_number ?? null,
    };
  });

  const refundRows = refunds.map((rf) => {
    const b = bookingById.get(rf.booking_id) as any;
    const i = invoiceByBookingId.get(rf.booking_id);
    return {
      id: rf.id,
      bookingId: rf.booking_id,
      venueName: b?.venues?.name ?? "Venue booking",
      venueSlug: b?.venues?.slug ?? null,
      eventDate: b?.event_date ?? null,
      recordedAt: rf.processed_at ?? rf.created_at,
      amount: Number(rf.amount),
      currency: rf.currency ?? "PHP",
      provider: rf.payment_provider,
      reference: rf.provider_reference ?? rf.transaction_id,
      status: rf.status,
      type: "refund",
      receiptNumber: null,
      invoiceNumber: i?.invoice_number ?? null,
    };
  });

  const historyRows = [...transactionRows, ...refundRows].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return (
    <div className="space-y-8">
      {/* ACTION REQUIRED: Payable Bookings */}
      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            Action Required
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950">
            Outstanding Invoices & Payments
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Choose an approved booking to start or resume its secure checkout.
          </p>
        </div>

        <div className="grid gap-3 p-6 sm:p-8">
          {bookingsError ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              Could not load payable bookings.
            </p>
          ) : payableBookings.length > 0 ? (
            payableBookings.map((booking: any) => (
              <div
                key={booking.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-[#F9FAFB] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link href={`/bookings/${booking.id}`} className="text-sm font-extrabold text-[#2563EB] hover:underline">
                    {booking.venues?.name ?? "Venue booking"}
                  </Link>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {formatDate(booking.event_date)} - Deposit {formatCurrency(booking.deposit_amount, "PHP")}
                  </p>
                </div>
                <Link
                  href={`/bookings/${booking.id}/payment`}
                  className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
                >
                  Pay Deposit
                </Link>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center">
              <p className="text-sm font-extrabold text-slate-800">
                All caught up
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                You have no outstanding invoices or pending payments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* HISTORY: Transactions, Receipts, Refunds */}
      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            History
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950">
            Billing & Refunds
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Deposits, receipts, invoices, and refunds tied to your venue bookings.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {historyError ? (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-extrabold">Could not load billing history</p>
                  <p className="mt-1 text-sm font-semibold">{historyError}</p>
                </div>
              </div>
            </div>
          ) : historyRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-950">No history yet</p>
              <p className="mt-1.5 max-w-sm text-sm font-medium text-slate-500">
                Paid invoices, receipts, and refunds will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB]/80">
              <table className="min-w-[920px] border-collapse bg-white text-left">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    {["Venue / booking", "Date", "Type", "Method", "Reference", "Amount", "Status", "Documents"].map((heading) => (
                      <th key={heading} className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => {
                    const statusStyle = STATUS_STYLES[row.status] ?? "bg-slate-100 text-slate-600 border-slate-200";
                    return (
                      <tr key={`${row.type}-${row.id}`} className="border-t border-[#E5E7EB]/80">
                        <td className="px-5 py-4 text-sm font-bold text-slate-950">
                          <Link href={`/bookings/${row.bookingId}`} className="hover:text-[#2563EB] hover:underline">
                            {row.venueName}
                          </Link>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            Event {formatDate(row.eventDate)}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-500">{formatDate(row.recordedAt)}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatType(row.type)}</td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-500">{PROVIDER_LABELS[row.provider] ?? row.provider}</td>
                        <td className="max-w-[180px] px-5 py-4 text-xs font-semibold text-slate-500">
                          <span className="block truncate">{row.reference ?? "-"}</span>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-950">{formatCurrency(row.amount, row.currency ?? "PHP")}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${statusStyle}`}>
                            {formatStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                          {row.receiptNumber && <p>Receipt {row.receiptNumber}</p>}
                          {row.invoiceNumber && <p>Invoice {row.invoiceNumber}</p>}
                          {!row.receiptNumber && !row.invoiceNumber && "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT METHODS */}
      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            Checkout options
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950">
            Payment methods
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Venora does not store saved cards or wallet credentials. Booking
            payments use secure hosted checkout from the enabled provider.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:p-8 md:grid-cols-2 xl:grid-cols-3">
          {activeProviderDetails.length > 0 ? (
            activeProviderDetails.map((provider) => (
              <div key={provider.id} className="rounded-3xl border border-slate-200 bg-[#F9FAFB] p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-950">{provider.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {provider.methods.map((method) => (
                    <span key={method} className="rounded-full border border-[#DBEAFE] bg-white px-3 py-1 text-xs font-extrabold text-[#1D4ED8]">
                      {method}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs font-medium leading-5 text-slate-500">{provider.note}</p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 md:col-span-2 xl:col-span-3">
              <p className="text-sm font-extrabold text-slate-800">No checkout provider enabled</p>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                A payment provider secret must be configured before customers can start hosted checkout.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-[#E5E7EB]/80 bg-[#F9FAFB] p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">No saved credential storage</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Venora never stores raw card numbers, CVVs, or wallet credentials.
              Payment details are entered only through the active provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
