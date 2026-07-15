import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Transactions",
};

export const dynamic = "force-dynamic";

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
  maya: "Maya",
  stripe: "Stripe",
};

type BookingRow = {
  id: string;
  event_date: string | null;
  venues: { name: string | null; slug: string | null } | null;
};

type HistoryRow = {
  id: string;
  bookingId: string;
  venueName: string;
  venueSlug: string | null;
  eventDate: string | null;
  recordedAt: string;
  amount: number | null;
  currency: string | null;
  provider: string;
  reference: string | null;
  status: string;
  type: string;
  receiptNumber: string | null;
  invoiceNumber: string | null;
};

function formatCurrency(value: number | null | undefined, currency = "PHP") {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "-";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
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

export default async function TransactionsPage() {
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, event_date, venues(name, slug)")
    .eq("customer_id", user.id);

  if (bookingsError) {
    console.error(
      "[account/transactions] Bookings fetch error:",
      bookingsError.message,
    );
  }

  const bookingRows = (bookings ?? []) as BookingRow[];
  const bookingIds = bookingRows.map((booking) => booking.id);
  const bookingById = new Map(
    bookingRows.map((booking) => [booking.id, booking]),
  );

  let transactions: any[] = [];
  let refunds: any[] = [];
  let receipts: any[] = [];
  let invoices: any[] = [];
  let historyError: string | null = bookingsError?.message ?? null;

  if (bookingIds.length > 0) {
    const [transactionsResult, refundsResult, receiptsResult, invoicesResult] =
      await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, booking_id, amount, currency, commission_amount, payment_provider, provider_reference, status, payment_kind, checkout_url, paid_at, failed_at, failure_reason, created_at",
          )
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("refunds")
          .select(
            "id, booking_id, transaction_id, amount, currency, status, reason, payment_provider, provider_reference, processed_at, created_at",
          )
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
          .order("issued_at", { ascending: false }),
      ]);

    for (const result of [
      transactionsResult,
      refundsResult,
      receiptsResult,
      invoicesResult,
    ]) {
      if (result.error) {
        historyError = result.error.message;
        console.error(
          "[account/transactions] History fetch error:",
          result.error.message,
        );
      }
    }

    transactions = transactionsResult.data ?? [];
    refunds = refundsResult.data ?? [];
    receipts = receiptsResult.data ?? [];
    invoices = invoicesResult.data ?? [];
  }

  const receiptByTransactionId = new Map(
    receipts.map((receipt) => [receipt.transaction_id, receipt]),
  );
  const invoiceByBookingId = new Map<string, any>();
  for (const invoice of invoices) {
    if (!invoiceByBookingId.has(invoice.booking_id)) {
      invoiceByBookingId.set(invoice.booking_id, invoice);
    }
  }

  const transactionRows: HistoryRow[] = transactions.map((transaction) => {
    const booking = bookingById.get(transaction.booking_id);
    const receipt = receiptByTransactionId.get(transaction.id);
    const invoice = invoiceByBookingId.get(transaction.booking_id);

    return {
      id: transaction.id,
      bookingId: transaction.booking_id,
      venueName: booking?.venues?.name ?? "Venue booking",
      venueSlug: booking?.venues?.slug ?? null,
      eventDate: booking?.event_date ?? null,
      recordedAt:
        transaction.paid_at ?? transaction.failed_at ?? transaction.created_at,
      amount: Number(transaction.amount),
      currency: transaction.currency ?? "PHP",
      provider: transaction.payment_provider,
      reference: transaction.provider_reference ?? transaction.id,
      status: transaction.status,
      type: transaction.payment_kind ?? "payment",
      receiptNumber: receipt?.receipt_number ?? null,
      invoiceNumber: invoice?.invoice_number ?? null,
    };
  });

  const refundRows: HistoryRow[] = refunds.map((refund) => {
    const booking = bookingById.get(refund.booking_id);
    const invoice = invoiceByBookingId.get(refund.booking_id);

    return {
      id: refund.id,
      bookingId: refund.booking_id,
      venueName: booking?.venues?.name ?? "Venue booking",
      venueSlug: booking?.venues?.slug ?? null,
      eventDate: booking?.event_date ?? null,
      recordedAt: refund.processed_at ?? refund.created_at,
      amount: Number(refund.amount),
      currency: refund.currency ?? "PHP",
      provider: refund.payment_provider,
      reference: refund.provider_reference ?? refund.transaction_id,
      status: refund.status,
      type: "refund",
      receiptNumber: null,
      invoiceNumber: invoice?.invoice_number ?? null,
    };
  });

  const historyRows = [...transactionRows, ...refundRows].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
      <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
          <Receipt className="h-5 w-5" />
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
          Payment history
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
          Transactions
        </h1>

        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
          Deposits, checkout attempts, receipts, invoices, and refunds tied to
          your venue bookings.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {historyError ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-extrabold">
                  Could not load transactions
                </p>
                <p className="mt-1 text-sm font-semibold">{historyError}</p>
              </div>
            </div>
          </div>
        ) : historyRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-950">
              No transactions yet
            </p>
            <p className="mt-1.5 max-w-sm text-sm font-medium text-slate-500">
              Approved booking payments and refunds will appear here after
              checkout starts.
            </p>
            <Link
              href="/venues"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
            >
              Browse venues
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB]/80">
            <table className="min-w-[920px] border-collapse bg-white text-left">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  {[
                    "Venue / booking",
                    "Date",
                    "Type",
                    "Method",
                    "Reference",
                    "Amount",
                    "Status",
                    "Documents",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {historyRows.map((row) => {
                  const statusStyle =
                    STATUS_STYLES[row.status] ??
                    "bg-slate-100 text-slate-600 border-slate-200";
                  const venueContent = row.venueSlug ? (
                    <Link
                      href={`/venues/${row.venueSlug}`}
                      className="hover:text-[#2563EB]"
                    >
                      {row.venueName}
                    </Link>
                  ) : (
                    row.venueName
                  );

                  return (
                    <tr
                      key={`${row.type}-${row.id}`}
                      className="border-t border-[#E5E7EB]/80"
                    >
                      <td className="px-5 py-4 text-sm font-bold text-slate-950">
                        {venueContent}
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          Event {formatDate(row.eventDate)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-500">
                        {formatDate(row.recordedAt)}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {formatType(row.type)}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-500">
                        {PROVIDER_LABELS[row.provider] ?? row.provider}
                      </td>
                      <td className="max-w-[180px] px-5 py-4 text-xs font-semibold text-slate-500">
                        <span className="block truncate">
                          {row.reference ?? "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        {formatCurrency(row.amount, row.currency ?? "PHP")}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${statusStyle}`}
                        >
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {row.receiptNumber ? (
                          <p>Receipt {row.receiptNumber}</p>
                        ) : null}
                        {row.invoiceNumber ? (
                          <p>Invoice {row.invoiceNumber}</p>
                        ) : null}
                        {!row.receiptNumber && !row.invoiceNumber ? "-" : null}
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
  );
}
