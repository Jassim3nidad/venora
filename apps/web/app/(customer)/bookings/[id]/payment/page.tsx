import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import {
  CustomerCard,
  CustomerLinkButton,
  CustomerPageHeader,
  CustomerStatusBadge,
} from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { BookingStatusBadge } from "@/src/features/booking/ui/booking-status-badge";
import { StartPaymentForm } from "@/src/features/booking/ui/booking-action-controls";
import type { BookingStatusValue } from "@/src/features/booking/domain/value-objects/booking-status.vo";

export const metadata: Metadata = {
  title: "Payment | Venora",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(date);
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
    .select(`
      id,
      status,
      event_date,
      total_amount,
      deposit_amount,
      payment_due_at,
      confirmed_at,
      venues (
        name,
        slug
      ),
      transactions (
        id,
        amount,
        payment_provider,
        provider_reference,
        status,
        created_at,
        paid_at
      )
    `)
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();

  if (!booking) notFound();

  const status = booking.status as BookingStatusValue;
  const payable = status === "approved" || status === "payment_pending";
  const paid = ["confirmed", "completed", "reviewed"].includes(status);
  const pendingTransaction = (booking.transactions ?? []).find(
    (transaction: { status: string }) => transaction.status === "pending",
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <CustomerNavbar />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href={`/bookings/${id}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to booking
        </Link>

        <CustomerPageHeader
          eyebrow="Secure deposit"
          icon={CreditCard}
          title={`Pay ${booking.venues?.name ?? "venue"} deposit`}
          description={`Event date: ${formatDate(booking.event_date)}`}
          action={<BookingStatusBadge status={status} />}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <CustomerCard className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                  Approved quote
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {formatCurrency(booking.total_amount)}
                </p>
              </div>
              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4 text-[#1D4ED8]">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]">
                  Deposit due
                </p>
                <p className="mt-2 text-2xl font-black">
                  {formatCurrency(booking.deposit_amount)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <CustomerStatusBadge icon={ShieldCheck}>Payment status</CustomerStatusBadge>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                {paid
                  ? "Your deposit has been confirmed."
                  : pendingTransaction
                    ? "A payment attempt is pending provider confirmation."
                    : payable
                      ? "Choose a provider to start the deposit payment."
                      : "This booking is not currently payable."}
              </p>
              {booking.payment_due_at ? (
                <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                  Due by {formatDate(booking.payment_due_at)}
                </p>
              ) : null}
            </div>

            {payable ? (
              <div className="mt-5">
                <StartPaymentForm bookingId={id} />
              </div>
            ) : paid ? (
              <div className="mt-5">
                <CustomerLinkButton href={`/bookings/${id}/confirmation`}>
                  View Confirmation
                </CustomerLinkButton>
              </div>
            ) : null}
          </CustomerCard>

          <CustomerCard className="p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              Payment records
            </h2>
            <div className="mt-4 grid gap-3">
              {(booking.transactions ?? []).length > 0 ? (
                booking.transactions.map((transaction: any) => (
                  <div key={transaction.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">{formatCurrency(transaction.amount)}</p>
                      <span className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-[#2563EB]">
                        {transaction.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {String(transaction.payment_provider).toUpperCase()} - {formatDate(transaction.paid_at ?? transaction.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-semibold text-slate-500">
                  No payment attempts yet.
                </p>
              )}
            </div>
          </CustomerCard>
        </div>
      </main>
    </div>
  );
}
