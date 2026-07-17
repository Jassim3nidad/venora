import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  canCancelBookingStatus,
  type BookingStatusValue,
} from "@/src/features/booking/domain/value-objects/booking-status.vo";
import { BookingCancellationForm } from "@/src/features/booking/ui/BookingCancellationForm";

export const metadata: Metadata = {
  title: "Cancel Booking | Venora",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CancelBookingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/bookings/${id}/cancel`);
  }

  const { data: booking, error } = (await supabase
    .from("bookings")
    .select(
      `
        id,
        status,
        event_date,
        event_start_time,
        guest_count,
        total_amount,
        deposit_amount,
        venues (
          name,
          slug
        ),
        venue_packages (
          name
        )
      `,
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .single()) as any;

  if (error || !booking) {
    notFound();
  }

  const status = booking.status as BookingStatusValue;

  if (["completed", "cancelled", "declined", "withdrawn"].includes(status)) {
    return (
      <div className="bg-[#F8FAFC] text-[#111827] min-h-screen">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Booking inactive</h2>
            <p className="text-slate-600 mb-6">
              This booking has already been {status} and can no longer be cancelled.
            </p>
            <Link
              href={`/bookings/${id}`}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white transition hover:bg-[#1D4ED8]"
            >
              Back to booking details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!canCancelBookingStatus(status)) {
    redirect(`/bookings/${id}`);
  }

  const venue = Array.isArray(booking.venues) ? booking.venues[0] : booking.venues;
  const packageData = Array.isArray(booking.venue_packages) ? booking.venue_packages[0] : booking.venue_packages;

  const bookingSummary = {
    id: booking.id,
    status: status,
    eventDate: booking.event_date,
    eventStartTime: booking.event_start_time,
    guestCount: booking.guest_count,
    venueName: venue?.name ?? "Venue",
    venueSlug: venue?.slug,
    coverImageUrl: venue?.photos?.cover_image_url ?? venue?.photos?.image_urls?.[0],
    packageName: packageData?.name ?? "Custom quote",
  };

  let eyebrow = "Cancel booking";
  let title = "Cancel this booking?";
  let description = "Tell us why you’re cancelling. The venue will be notified immediately.";

  if (status === "pending") {
    eyebrow = "Withdraw request";
    title = "Withdraw booking request?";
    description = "Tell us why you’re withdrawing your request. The venue will be notified immediately.";
  } else if (status === "confirmed" || status === "payment_pending") {
    title = "Cancel this confirmed booking?";
  }

  return (
    <div className="bg-[#F8FAFC] text-[#111827] min-h-screen">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={`/bookings/${id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to booking details
        </Link>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-widest text-[#2563EB] mb-2">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base text-slate-600">
            {description}
          </p>
        </div>

        <BookingCancellationForm booking={bookingSummary} />
      </div>
    </div>
  );
}
