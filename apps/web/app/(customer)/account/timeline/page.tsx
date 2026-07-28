import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  TimelinePlanner,
  type TimelineBookingOption,
} from "@/features/timeline/ui/TimelinePlanner";
import type { Tables } from "@venora/database";

type BookingRow = {
  id: string;
  event_date: string;
  venues: { name: string } | Array<{ name: string }> | null;
};

export const metadata: Metadata = { title: "Event Timeline" };
export const dynamic = "force-dynamic";

export default async function TimelinePlannerPage() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tasks, error }, { data: bookingRows }] = await Promise.all([
    supabase
      .from("event_timeline_tasks")
      .select(
        "id,user_id,booking_id,title,description,start_time,end_time,owner_name,supplier_id,status,priority,depends_on_task_id,created_at,updated_at",
      )
      .eq("user_id", user.id)
      .order("start_time", { nullsFirst: false }),
    supabase
      .from("bookings")
      .select("id,event_date,venues(name)")
      .eq("customer_id", user.id)
      .order("event_date", { ascending: false }),
  ]);

  if (error) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-bold text-amber-950">
          Event timeline is being prepared
        </h2>
        <p className="mt-2 text-sm text-amber-800">
          Database setup is not available in this environment yet. No timeline
          information was changed.
        </p>
      </section>
    );
  }

  const bookings: TimelineBookingOption[] = (
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
    <TimelinePlanner
      tasks={(tasks ?? []) as Array<Tables<"event_timeline_tasks">>}
      bookings={bookings}
    />
  );
}
