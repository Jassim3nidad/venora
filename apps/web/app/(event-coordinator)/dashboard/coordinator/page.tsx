import { CoordinatorOverview } from "@/components/dashboard/enterprise";
import {
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "@/lib/dashboard/org-dashboard-data";

export const metadata = {
  title: "Event Coordinator Dashboard",
};
export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

export default async function CoordinatorDashboardPage() {
  const context = await getOwnerDashboardContext();
  const { supabase, user, orgIds, isAdmin } = context;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: orgs } =
    orgIds.length > 0
      ? await supabase
          .from("organizations")
          .select("name")
          .in("id", orgIds)
          .limit(1)
      : { data: [] };

  let venuesQuery = supabase.from("venues").select("id, name, status");
  if (!isAdmin) venuesQuery = venuesQuery.in("organization_id", orgIds);
  const { data: venues } =
    isAdmin || orgIds.length > 0 ? await venuesQuery : { data: [] };

  const venueIds = await getOwnerVenueIds(context);
  const { data: bookingsRaw } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select("id, event_date, status, guest_count, venue_id, venues(name)")
          .in("venue_id", venueIds)
          .order("event_date", { ascending: false })
      : { data: [] };

  type BookingRow = {
    id: string;
    event_date: string;
    status: string;
    guest_count: number;
    venue_id: string;
    venues: { name: string } | null;
  };
  const bookings = (bookingsRaw ?? []) as BookingRow[];

  const activeEventCount = bookings.filter((b) =>
    ["approved", "payment_pending", "confirmed"].includes(b.status),
  ).length;
  const pendingEventCount = bookings.filter(
    (b) => b.status === "pending",
  ).length;
  const completedEventCount = bookings.filter(
    (b) => b.status === "completed",
  ).length;

  const upcomingEvents = bookings
    .filter(
      (b) =>
        !["completed", "cancelled", "declined", "expired"].includes(b.status),
    )
    .slice(0, 6)
    .map((b) => ({
      id: b.id,
      eventName: b.venues?.name ?? "Event",
      venue: b.venues?.name ?? "-",
      date: formatDate(b.event_date),
      guests: b.guest_count
        ? `${b.guest_count.toLocaleString("en-PH")} guests`
        : "-",
      status: b.status,
    }));

  const eventCountByVenue = new Map<string, number>();
  for (const booking of bookings) {
    if (
      ["pending", "approved", "payment_pending", "confirmed"].includes(
        booking.status,
      )
    ) {
      eventCountByVenue.set(
        booking.venue_id,
        (eventCountByVenue.get(booking.venue_id) ?? 0) + 1,
      );
    }
  }

  type VenueRow = { id: string; name: string; status: string };
  const managedVenues = ((venues ?? []) as VenueRow[]).map((venue) => ({
    id: venue.id,
    name: venue.name,
    eventCount: eventCountByVenue.get(venue.id) ?? 0,
    status: venue.status,
  }));

  return (
    <CoordinatorOverview
      coordinatorName={profile?.full_name ?? "Event Coordinator"}
      organizationName={orgs?.[0]?.name}
      venueCount={venues?.length ?? 0}
      activeEventCount={activeEventCount}
      pendingEventCount={pendingEventCount}
      completedEventCount={completedEventCount}
      upcomingEvents={upcomingEvents}
      managedVenues={managedVenues}
    />
  );
}
