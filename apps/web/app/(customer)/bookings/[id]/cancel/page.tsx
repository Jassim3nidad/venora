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
import { CustomerPageHeader } from "@/src/components/customer/CustomerUI";
import { BookingStatusBadge } from "@/src/features/booking/ui/booking-status-badge";

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
        venues (
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

  if (!canCancelBookingStatus(status)) {
    redirect(`/bookings/${id}`);
  }

  const venue = Array.isArray(booking.venues)
    ? booking.venues[0]
    : booking.venues;
  const venueName = venue?.name ?? "this venue";

  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href={`/bookings/${id}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to booking
        </Link>

        <CustomerPageHeader
          eyebrow="Cancel booking"
          title="Tell us why you are cancelling"
          description="Choose the reason that best matches your situation. The venue will be notified right away."
        />

        <div className="flex items-center gap-3">
          <BookingStatusBadge status={status} />
          <p className="text-sm font-semibold text-slate-500">
            Booking for {venueName}
          </p>
        </div>

        <BookingCancellationForm bookingId={id} venueName={venueName} />
      </div>
    </div>
  );
}
