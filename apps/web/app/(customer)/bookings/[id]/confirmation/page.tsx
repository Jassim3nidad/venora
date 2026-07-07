import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, CreditCard, MapPin, TicketCheck } from "lucide-react";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import {
  CustomerCard,
  CustomerLinkButton,
  CustomerPageHeader,
  CustomerStatusBadge,
} from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { BookingStatusBadge } from "@/src/features/booking/ui/booking-status-badge";
import type { BookingStatusValue } from "@/src/features/booking/domain/value-objects/booking-status.vo";

export const metadata: Metadata = {
  title: "Booking Confirmation | Venora",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: value.includes("T") ? "medium" : "long",
    ...(value.includes("T") ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

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

export default async function BookingConfirmationPage({ params }: Props) {
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=/bookings/${id}/confirmation`);

  const profile = await getNavbarProfile(supabase, user.id);

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      event_date,
      event_start_time,
      event_end_time,
      guest_count,
      total_amount,
      deposit_amount,
      confirmed_at,
      payment_started_at,
      venues (
        name,
        slug,
        city,
        province
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
  const isConfirmed = ["confirmed", "completed", "reviewed"].includes(status);
  const paidTransaction = (booking.transactions ?? []).find(
    (transaction: { status: string }) => transaction.status === "paid",
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <CustomerNavbar user={user} profile={profile} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href={`/bookings/${id}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to booking
        </Link>

        <CustomerPageHeader
          eyebrow={isConfirmed ? "Confirmed" : "Payment pending"}
          icon={isConfirmed ? CheckCircle2 : Clock3}
          title={isConfirmed ? "Your booking is confirmed." : "Waiting for payment confirmation."}
          description={`${booking.venues?.name ?? "Venue"} - ${formatDate(booking.event_date)}`}
          action={<BookingStatusBadge status={status} />}
        />

        <CustomerCard className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <CustomerStatusBadge icon={TicketCheck}>Booking ID</CustomerStatusBadge>
              <p className="mt-3 break-all text-sm font-black text-slate-950">{booking.id}</p>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <CustomerStatusBadge icon={CalendarDays}>Event</CustomerStatusBadge>
              <p className="mt-3 text-lg font-black text-slate-950">{formatDate(booking.event_date)}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {booking.event_start_time || "Start time pending"} - {booking.event_end_time || "End time pending"}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <CustomerStatusBadge icon={MapPin}>Venue</CustomerStatusBadge>
              <p className="mt-3 text-lg font-black text-slate-950">{booking.venues?.name ?? "Venue"}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {[booking.venues?.city, booking.venues?.province].filter(Boolean).join(", ") || "Location unavailable"}
              </p>
            </div>

            <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4 text-[#1D4ED8]">
              <CustomerStatusBadge icon={CreditCard} className="border-[#BFDBFE] bg-white text-[#1D4ED8]">
                Payment
              </CustomerStatusBadge>
              <p className="mt-3 text-lg font-black">
                {paidTransaction ? formatCurrency(paidTransaction.amount) : formatCurrency(booking.deposit_amount)}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {paidTransaction
                  ? `${String(paidTransaction.payment_provider).toUpperCase()} - ${formatDate(paidTransaction.paid_at ?? paidTransaction.created_at)}`
                  : "Provider confirmation pending"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isConfirmed ? (
              <CustomerLinkButton href={`/bookings/${id}`}>
                View Booking
              </CustomerLinkButton>
            ) : (
              <CustomerLinkButton href={`/bookings/${id}/payment`}>
                Return to Payment
              </CustomerLinkButton>
            )}
            {booking.venues?.slug ? (
              <CustomerLinkButton href={`/venues/${booking.venues.slug}`} tone="secondary">
                View Venue
              </CustomerLinkButton>
            ) : null}
          </div>
        </CustomerCard>
      </main>
    </div>
  );
}
