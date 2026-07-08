import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Star,
  TicketCheck,
  Users,
} from "lucide-react";
import {
  CustomerCard,
  CustomerLinkButton,
  CustomerPageHeader,
  CustomerStatusBadge,
} from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { BookingStatusBadge } from "@/src/features/booking/ui/booking-status-badge";
import { CustomerCancelBookingButton } from "@/src/features/booking/ui/booking-action-controls";
import type { BookingStatusValue } from "@/src/features/booking/domain/value-objects/booking-status.vo";

export const metadata: Metadata = {
  title: "Booking Details | Venora",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

type BookingDetail = {
  id: string;
  customer_id: string;
  status: BookingStatusValue;
  event_date: string;
  event_start_time: string | null;
  event_end_time: string | null;
  guest_count: number;
  total_amount: number | null;
  deposit_amount: number | null;
  special_requests: string | null;
  payment_due_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  venues: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    province: string | null;
  } | null;
  venue_packages: {
    name: string;
    price: number;
    price_unit: string;
  } | null;
  transactions: Array<{
    id: string;
    amount: number;
    payment_provider: string;
    provider_reference: string | null;
    status: string;
    created_at: string;
    paid_at: string | null;
  }> | null;
  booking_status_history: Array<{
    status: BookingStatusValue;
    note: string | null;
    created_at: string;
  }> | null;
  reviews: Array<{ id: string; overall_rating: number; comment: string | null }> | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

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

function locationLabel(venue: BookingDetail["venues"]) {
  if (!venue) return "Location unavailable";
  if (venue.city && venue.province) return `${venue.city}, ${venue.province}`;
  return venue.city || venue.province || "Location unavailable";
}

function nextAction(booking: BookingDetail) {
  if (booking.status === "approved" || booking.status === "payment_pending") {
    return (
      <CustomerLinkButton href={`/bookings/${booking.id}/payment`}>
        <CreditCard className="h-4 w-4" />
        Pay Deposit
      </CustomerLinkButton>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <CustomerLinkButton href={`/bookings/${booking.id}/confirmation`}>
        <CheckCircle2 className="h-4 w-4" />
        View Confirmation
      </CustomerLinkButton>
    );
  }

  if (booking.status === "completed" && !booking.reviews?.length) {
    return (
      <CustomerLinkButton href={`/bookings/${booking.id}/review`}>
        <Star className="h-4 w-4" />
        Review Venue
      </CustomerLinkButton>
    );
  }

  if (booking.venues?.slug) {
    return (
      <CustomerLinkButton href={`/venues/${booking.venues.slug}`} tone="secondary">
        View Venue
      </CustomerLinkButton>
    );
  }

  return null;
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=/bookings/${id}`);

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_id,
      status,
      event_date,
      event_start_time,
      event_end_time,
      guest_count,
      total_amount,
      deposit_amount,
      special_requests,
      payment_due_at,
      confirmed_at,
      completed_at,
      reviewed_at,
      venues (
        id,
        name,
        slug,
        city,
        province
      ),
      venue_packages (
        name,
        price,
        price_unit
      ),
      transactions (
        id,
        amount,
        payment_provider,
        provider_reference,
        status,
        created_at,
        paid_at
      ),
      booking_status_history (
        status,
        note,
        created_at
      ),
      reviews (
        id,
        overall_rating,
        comment
      )
    `)
    .eq("id", id)
    .single();

  if (error || !booking) {
    notFound();
  }

  const typedBooking = booking as BookingDetail;
  const canCancel = ["pending", "approved", "payment_pending", "confirmed"].includes(typedBooking.status);

  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/bookings"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Link>

        <CustomerPageHeader
          eyebrow="Booking details"
          icon={TicketCheck}
          title={typedBooking.venues?.name ?? "Venue Booking"}
          description={`${formatDate(typedBooking.event_date)} - ${typedBooking.guest_count.toLocaleString("en-PH")} guests`}
          action={<BookingStatusBadge status={typedBooking.status} />}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="grid gap-6">
            <CustomerCard className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <CustomerStatusBadge icon={CalendarDays}>Event date</CustomerStatusBadge>
                  <p className="mt-3 text-lg font-black text-slate-950">{formatDate(typedBooking.event_date)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {typedBooking.event_start_time || "Start time pending"} - {typedBooking.event_end_time || "End time pending"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <CustomerStatusBadge icon={MapPin}>Venue</CustomerStatusBadge>
                  <p className="mt-3 text-lg font-black text-slate-950">{typedBooking.venues?.name ?? "Venue"}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{locationLabel(typedBooking.venues)}</p>
                </div>

                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <CustomerStatusBadge icon={Users}>Guests</CustomerStatusBadge>
                  <p className="mt-3 text-lg font-black text-slate-950">
                    {typedBooking.guest_count.toLocaleString("en-PH")}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <CustomerStatusBadge icon={CreditCard}>Quote</CustomerStatusBadge>
                  <p className="mt-3 text-lg font-black text-slate-950">
                    {formatCurrency(typedBooking.total_amount)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Deposit: {formatCurrency(typedBooking.deposit_amount)}
                  </p>
                </div>
              </div>
            </CustomerCard>

            <CustomerCard className="p-5 sm:p-6">
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Status timeline</h2>
              <div className="mt-5 grid gap-0">
                {(typedBooking.booking_status_history ?? []).map((item) => (
                  <div key={`${item.status}-${item.created_at}`} className="flex gap-3 border-l border-[#DBEAFE] pb-5 last:border-transparent last:pb-0">
                    <span className="-ml-[13px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white">
                      <Clock3 className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-black capitalize text-slate-950">
                        {item.status.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatDate(item.created_at)}
                      </p>
                      {item.note ? (
                        <p className="mt-2 text-sm font-medium text-slate-600">{item.note}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CustomerCard>

            <CustomerCard className="p-5 sm:p-6">
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Notes</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Your inquiry</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    {typedBooking.special_requests || "No notes added."}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Venue response</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    {"Awaiting venue response."}
                  </p>
                </div>
              </div>
            </CustomerCard>
          </div>

          <aside className="grid gap-4 lg:sticky lg:top-24">
            <CustomerCard className="p-5 sm:p-6">
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Next step</h2>
              <div className="mt-4 grid gap-3">
                {nextAction(typedBooking)}
                {canCancel ? <CustomerCancelBookingButton bookingId={typedBooking.id} /> : null}
              </div>
            </CustomerCard>

            <CustomerCard className="p-5 sm:p-6">
              <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Transactions</h2>
              <div className="mt-4 grid gap-3">
                {(typedBooking.transactions ?? []).length > 0 ? (
                  typedBooking.transactions?.map((transaction) => (
                    <div key={transaction.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-950">{formatCurrency(transaction.amount)}</p>
                        <span className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-[#2563EB]">
                          {transaction.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {transaction.payment_provider.toUpperCase()} - {formatDate(transaction.paid_at ?? transaction.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-semibold text-slate-500">
                    No transactions yet.
                  </p>
                )}
              </div>
            </CustomerCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
