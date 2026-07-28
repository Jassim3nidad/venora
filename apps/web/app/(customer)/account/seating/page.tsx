import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SeatingPlanner,
  type SeatingBookingOption,
} from "@/features/seating/ui/SeatingPlanner";
import type { Tables } from "@venora/database";

type BookingRow = {
  id: string;
  event_date: string;
  venues: { name: string } | Array<{ name: string }> | null;
};

export const metadata: Metadata = { title: "Seating Planner" };
export const dynamic = "force-dynamic";

export default async function SeatingPlannerPage() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: tables, error: tableError },
    { data: assignments, error: assignmentError },
    { data: guests, error: guestError },
    { data: bookingRows },
  ] = await Promise.all([
    supabase
      .from("event_seating_tables")
      .select("id,user_id,booking_id,table_name,capacity,notes,created_at")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("event_seating_assignments")
      .select("id,table_id,guest_id,seat_number,created_at")
      .order("created_at"),
    supabase
      .from("event_guests")
      .select(
        "id,user_id,booking_id,first_name,last_name,email,phone,guest_group,plus_ones_allowed,plus_ones_attending,dietary_requirements,accessibility_notes,rsvp_status,rsvp_token,invitation_sent_at,rsvp_deadline,rsvp_responded_at,rsvp_revoked_at,created_at,updated_at",
      )
      .eq("user_id", user.id)
      .order("first_name"),
    supabase
      .from("bookings")
      .select("id,event_date,venues(name)")
      .eq("customer_id", user.id)
      .order("event_date", { ascending: false }),
  ]);

  if (tableError || assignmentError || guestError) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-bold text-amber-950">
          Seating planner is being prepared
        </h2>
        <p className="mt-2 text-sm text-amber-800">
          Database setup is not available in this environment yet. No seating
          information was changed.
        </p>
      </section>
    );
  }

  const bookings: SeatingBookingOption[] = (
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
    <SeatingPlanner
      tables={(tables ?? []) as Array<Tables<"event_seating_tables">>}
      assignments={
        (assignments ?? []) as Array<Tables<"event_seating_assignments">>
      }
      guests={(guests ?? []) as Array<Tables<"event_guests">>}
      bookings={bookings}
    />
  );
}
