import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Transactions",
};

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-slate-100 text-slate-600 border-slate-200",
  partially_refunded: "bg-amber-50 text-amber-700 border-amber-200",
};

const PROVIDER_LABELS: Record<string, string> = {
  paymongo: "PayMongo",
  maya: "Maya",
  stripe: "Stripe",
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `\u20b1${Number(value).toLocaleString("en-PH")}`;
}

function formatStatusLabel(status: string) {
  return status
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
    console.error("[account/transactions] Bookings fetch error:", bookingsError.message);
  }

  const bookingIds = (bookings ?? []).map((booking: any) => booking.id);
  const bookingById = new Map<string, any>(
    (bookings ?? []).map((booking: any) => [booking.id, booking]),
  );

  let transactions: any[] = [];

  if (bookingIds.length > 0) {
    const { data: transactionRows, error: transactionsError } = await supabase
      .from("transactions")
      .select(
        "id, booking_id, amount, commission_amount, payment_provider, provider_reference, status, created_at",
      )
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });

    if (transactionsError) {
      console.error(
        "[account/transactions] Transactions fetch error:",
        transactionsError.message,
      );
    } else {
      transactions = transactionRows ?? [];
    }
  }

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
          A record of deposits and payments made toward your venue bookings.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-950">
              No transactions yet
            </p>
            <p className="mt-1.5 max-w-sm text-sm font-medium text-slate-500">
              Book a venue to see your payment history here.
            </p>
            <Link
              href="/venues"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
            >
              Browse venues
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB]/80">
            <table className="w-full border-collapse bg-white text-left">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                    Venue
                  </th>
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                    Date
                  </th>
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                    Provider
                  </th>
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => {
                  const booking = bookingById.get(transaction.booking_id);
                  const venue = booking?.venues;
                  const statusStyle =
                    STATUS_STYLES[transaction.status] ??
                    "bg-slate-100 text-slate-600 border-slate-200";

                  return (
                    <tr
                      key={transaction.id}
                      className="border-t border-[#E5E7EB]/80"
                    >
                      <td className="px-5 py-4 text-sm font-bold text-slate-950">
                        {venue ? (
                          <Link
                            href={`/venues/${venue.slug ?? ""}`}
                            className="hover:text-[#2563EB]"
                          >
                            {venue.name}
                          </Link>
                        ) : (
                          "Venue"
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-500">
                        {booking?.event_date
                          ? new Date(booking.event_date).toLocaleDateString(
                              "en-PH",
                              { dateStyle: "medium" },
                            )
                          : new Date(transaction.created_at).toLocaleDateString(
                              "en-PH",
                              { dateStyle: "medium" },
                            )}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-500">
                        {PROVIDER_LABELS[transaction.payment_provider] ??
                          transaction.payment_provider}
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-slate-950">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${statusStyle}`}
                        >
                          {formatStatusLabel(transaction.status)}
                        </span>
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
