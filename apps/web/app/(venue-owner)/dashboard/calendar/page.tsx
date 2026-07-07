import type { Metadata } from "next";
import {
  DashButton,
  DashboardSubPage,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  formatDate,
  formatPeso,
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "../_lib/owner-dashboard-data";

export const metadata: Metadata = {
  title: "Booking Calendar - Venora Dashboard",
};

type CalendarBooking = {
  id: string;
  event_date: string;
  status: string;
  guest_count: number;
  total_amount: number | null;
  venues: { name: string } | null;
  profiles: { full_name: string } | null;
};

export default async function CalendarPage() {
  const context = await getOwnerDashboardContext();
  const { supabase } = context;
  const venueIds = await getOwnerVenueIds(context);
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select(
            "id, event_date, status, guest_count, total_amount, venues(name), profiles!customer_id(full_name)",
          )
          .in("venue_id", venueIds)
          .gte("event_date", today)
          .order("event_date", { ascending: true })
          .limit(30)
      : { data: [] };

  const upcomingBookings = (bookings ?? []) as CalendarBooking[];

  return (
    <DashboardSubPage
      title="Booking Calendar"
      description="View upcoming reserved dates, tentative requests, and confirmed events."
      action={
        <DashButton href="/dashboard/bookings" variant="secondary" icon="calendar_month">
          View Bookings
        </DashButton>
      }
    >
      {upcomingBookings.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Upcoming Schedule"
            description="The next 30 dated bookings across your venues."
          />
          <div className="grid gap-3">
            {upcomingBookings.map((booking) => (
              <article
                key={booking.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d4ed8]">
                    <span className="text-xs font-bold uppercase">
                      {new Date(booking.event_date).toLocaleDateString("en-PH", {
                        month: "short",
                      })}
                    </span>
                    <span className="font-display text-xl font-bold">
                      {new Date(booking.event_date).getDate()}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#111827]">
                      {booking.venues?.name ?? "Venue booking"}
                    </h2>
                    <p className="mt-1 text-sm text-[#4b5563]">
                      {booking.profiles?.full_name ?? "Customer"} -{" "}
                      {booking.guest_count} guests - {formatPeso(booking.total_amount)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#6b7280]">
                      {formatDate(booking.event_date)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={booking.status} />
                </div>
              </article>
            ))}
          </div>
        </Panel>
      ) : (
        <EmptyState
          icon="event"
          title="No upcoming bookings"
          description="Confirmed and pending bookings for your venues will appear here once customers submit reservation requests."
          action={
            <DashButton href="/dashboard/venues" variant="secondary" icon="location_city">
              Review Venues
            </DashButton>
          }
        />
      )}
    </DashboardSubPage>
  );
}
