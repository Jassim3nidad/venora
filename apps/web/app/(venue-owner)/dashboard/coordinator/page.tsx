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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

export default async function CoordinatorDashboardPage(props: {
  searchParams: Promise<{ venue?: string; invitation?: string }>;
}) {
  const searchParams = await props.searchParams;
  const context = await getOwnerDashboardContext();
  const { supabase, user, orgIds, isAdmin } = context;
  const assignedVenueIds = await getOwnerVenueIds(context);
  const todayStr = new Date().toISOString().split("T")[0] ?? "";
  const invitationAccepted = searchParams.invitation === "accepted";

  let venueIds = assignedVenueIds;
  if (searchParams.venue && searchParams.venue !== "all") {
    if (assignedVenueIds.includes(searchParams.venue)) {
      venueIds = [searchParams.venue];
    }
  }

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

  const inviteEmail = user.email?.trim().toLowerCase() ?? "";
  const { data: pendingInvitationsRaw } = inviteEmail
    ? await supabase
        .from("organization_member_invitations")
        .select("id, organization_id, organizations(name), created_at")
        .eq("status", "pending")
        .eq("email", inviteEmail)
        .order("created_at", { ascending: false })
    : { data: [] };

  const pendingInvitations = (pendingInvitationsRaw ?? []).map((inv: any) => ({
    id: inv.id,
    organizationName: inv.organizations?.name ?? "Unknown Organization",
    date: formatDate(inv.created_at),
  }));

  let venuesQuery = supabase.from("venues").select("id, name, status");
  if (!isAdmin) venuesQuery = venuesQuery.in("id", venueIds);
  const { data: venues } =
    isAdmin || venueIds.length > 0 ? await venuesQuery : { data: [] };

  const { data: todayBookings } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select("id, event_date, status, venues(name)")
          .in("venue_id", venueIds)
          .eq("event_date", todayStr)
      : { data: [] };

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
  
  const upcomingEventCount = bookings.filter(
    (b) =>
      ["approved", "payment_pending", "confirmed"].includes(b.status) &&
      b.event_date >= todayStr
  ).length;

  const pendingEventCount = bookings.filter(
    (b) => b.status === "pending" || b.status === "inquiry"
  ).length;

  const eventsTodayCount = bookings.filter(
    (b) => b.event_date.startsWith(todayStr)
  ).length;

  const totalDecided = bookings.filter(b => ["approved", "confirmed", "declined", "cancelled"].includes(b.status)).length;
  const totalApproved = bookings.filter(b => ["approved", "confirmed", "completed"].includes(b.status)).length;
  
  const approvalRate = totalDecided > 0 
    ? `${Math.round((totalApproved / totalDecided) * 100)}%` 
    : "N/A";

  const upcomingEvents = bookings
    .filter(
      (b) =>
        !["completed", "cancelled", "declined", "expired"].includes(b.status) &&
        b.event_date >= todayStr
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

  // Fetch accredited supplier count
  const { count: accreditedSupplierCount } = venueIds.length > 0 
    ? await supabase
        .from("venue_preferred_suppliers")
        .select("supplier_id", { count: "exact", head: true })
        .in("venue_id", venueIds)
    : { count: 0 };

  return (
    <CoordinatorOverview
      coordinatorName={profile?.full_name ?? "Event Coordinator"}
      organizationName={orgs?.[0]?.name}
      venueCount={venues?.length ?? 0}
      upcomingEventCount={upcomingEventCount}
      pendingEventCount={pendingEventCount}
      eventsTodayCount={eventsTodayCount}
      unreadMessageCount={0}
      calendarConflictCount={0}
      accreditedSupplierCount={accreditedSupplierCount ?? 0}
      approvalRate={approvalRate}
      upcomingEvents={upcomingEvents}
      managedVenues={managedVenues}
      pendingInvitations={pendingInvitations}
      invitationAccepted={invitationAccepted}
    />
  );
}
