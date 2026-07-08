import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import {
  CustomerCard,
  CustomerLinkButton,
  CustomerPageHeader,
} from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { BookingReviewForm } from "@/src/features/booking/ui/booking-action-controls";

export const metadata: Metadata = {
  title: "Review Booking | Venora",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

export default async function BookingReviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=/bookings/${id}/review`);

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      venue_id,
      event_date,
      venues (
        name,
        slug
      ),
      reviews (
        id,
        overall_rating,
        comment
      )
    `)
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();

  if (!booking) notFound();

  const existingReview = booking.reviews?.[0];
  const canReview = booking.status === "completed" && !existingReview;

  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href={`/bookings/${id}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to booking
        </Link>

        <CustomerPageHeader
          eyebrow="Venue review"
          icon={Star}
          title={`Review ${booking.venues?.name ?? "your venue"}`}
          description={`Event date: ${formatDate(booking.event_date)}`}
        />

        <CustomerCard className="p-5 sm:p-6">
          {canReview ? (
            <BookingReviewForm bookingId={booking.id} venueId={booking.venue_id} userId={user.id} />
          ) : existingReview ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-5 text-[#1D4ED8]">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]">
                  Review submitted
                </p>
                <p className="mt-2 text-2xl font-black">
                  {existingReview.overall_rating} stars
                </p>
                {existingReview.comment ? (
                  <p className="mt-3 text-sm font-semibold leading-6">{existingReview.comment}</p>
                ) : null}
              </div>
              <CustomerLinkButton href={`/bookings/${id}`}>View Booking</CustomerLinkButton>
            </div>
          ) : (
            <div className="grid gap-4">
              <p className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-sm font-semibold leading-6 text-slate-600">
                Reviews open after the venue owner marks the event completed.
              </p>
              <CustomerLinkButton href={`/bookings/${id}`} tone="secondary">
                View Booking
              </CustomerLinkButton>
            </div>
          )}
        </CustomerCard>
      </div>
    </div>
  );
}
