import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  GuestManager,
  type GuestBookingOption,
} from "@/features/guests/ui/GuestManager";
import type { Tables } from "@venora/database";

type BookingRow = {
  id: string;
  event_date: string;
  venues: { name: string } | Array<{ name: string }> | null;
};

export const metadata: Metadata = {
  title: "Guest Management",
};

export const dynamic = "force-dynamic";

export default async function GuestManagementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: guests, error: guestError }, { data: bookingRows }] =
    await Promise.all([
      supabase
        .from("event_guests")
        .select(
          "id,user_id,booking_id,first_name,last_name,email,phone,guest_group,plus_ones_allowed,plus_ones_attending,dietary_requirements,accessibility_notes,rsvp_status,rsvp_token,invitation_sent_at,rsvp_deadline,rsvp_responded_at,rsvp_revoked_at,created_at,updated_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("bookings")
        .select("id,event_date,venues(name)")
        .eq("customer_id", user.id)
        .order("event_date", { ascending: false }),
    ]);

  if (guestError) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-bold text-amber-950">
          Guest management is being prepared
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Database setup is not available in this environment yet. No guest
          information was changed.
        </p>
      </section>
    );
  }

  const bookings: GuestBookingOption[] = (
    (bookingRows ?? []) as BookingRow[]
  ).map((booking) => {
    const venue = Array.isArray(booking.venues)
      ? booking.venues[0]
      : booking.venues;
    return {
      id: booking.id,
      label: `${venue?.name ?? "Venue booking"} · ${booking.event_date}`,
    };
  });

  return (
    <GuestManager
      guests={(guests ?? []) as Array<Tables<"event_guests">>}
      bookings={bookings}
    />
  );
}
