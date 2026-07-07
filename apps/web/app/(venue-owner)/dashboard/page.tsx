import {
  VenueOwnerOverview,
  type VenueOwnerBooking,
} from "@/components/dashboard/enterprise";
import {
  formatPeso,
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "./_lib/owner-dashboard-data";

export const metadata = {
  title: "Venue Owner Dashboard",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function VenueOwnerDashboardPage() {
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

  let venuesQuery = supabase
    .from("venues")
    .select("id, name, avg_rating, status");
  if (!isAdmin) venuesQuery = venuesQuery.in("organization_id", orgIds);
  const { data: venues } =
    isAdmin || orgIds.length > 0 ? await venuesQuery : { data: [] };

  const venueIds = await getOwnerVenueIds(context);
  const { data: bookingsRaw } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select(
            "id, event_date, status, total_amount, guest_count, venues(name), profiles!customer_id(full_name)",
          )
          .in("venue_id", venueIds)
          .order("event_date", { ascending: false })
          .limit(10)
      : { data: [] };

  const bookingCount = bookingsRaw?.length ?? 0;
  const pendingCount =
    bookingsRaw?.filter((b: { status: string }) => b.status === "pending")
      .length ?? 0;
  const monthlyRevenue = (bookingsRaw ?? [])
    .filter(
      (b: { status: string; total_amount: number | null }) =>
        b.status === "approved" ||
        b.status === "confirmed" ||
        b.status === "completed",
    )
    .reduce(
      (sum: number, b: { total_amount: number | null }) =>
        sum + (Number(b.total_amount) || 0),
      0,
    );

  const ratings = (venues ?? [])
    .map((v: { avg_rating: number }) => v.avg_rating)
    .filter((rating: number) => rating > 0);
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : null;

  const publishedVenues = (venues ?? []).filter(
    (v: { status: string }) => v.status === "published",
  );
  const profileCompletion = venues?.length
    ? Math.min(
        100,
        Math.round(
          (publishedVenues.length / venues.length) * 60 +
            (avgRating != null ? 20 : 0) +
            (bookingCount > 0 ? 20 : 0),
        ),
      )
    : 25;

  const bookings: VenueOwnerBooking[] = (bookingsRaw ?? []).map(
    (b: {
      id: string;
      event_date: string;
      status: string;
      total_amount: number | null;
      guest_count: number;
      venues: { name: string } | null;
      profiles: { full_name: string } | null;
    }) => {
      const venue = b.venues;
      const customer = b.profiles;
      const clientName = customer?.full_name ?? "Client";
      const eventDate = new Date(b.event_date);

      return {
        id: b.id,
        eventName: venue?.name ?? "Event Booking",
        eventType: `${b.guest_count} guests`,
        client: clientName,
        clientInitials: initials(clientName),
        date: eventDate.toLocaleDateString("en-PH", { dateStyle: "medium" }),
        time: eventDate.toLocaleTimeString("en-PH", {
          hour: "numeric",
          minute: "2-digit",
        }),
        revenue: formatPeso(b.total_amount),
        status:
          b.status === "approved" || b.status === "confirmed"
            ? "approved"
            : b.status === "declined"
              ? "declined"
              : "pending",
      };
    },
  );

  return (
    <VenueOwnerOverview
      userName={profile?.full_name ?? "Venue Owner"}
      businessName={orgs?.[0]?.name}
      venueCount={venues?.length ?? 0}
      bookingCount={bookingCount}
      pendingCount={pendingCount}
      monthlyRevenue={monthlyRevenue}
      avgRating={avgRating}
      profileCompletion={profileCompletion}
      bookings={bookings}
    />
  );
}
