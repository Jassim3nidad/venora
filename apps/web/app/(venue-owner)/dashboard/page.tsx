import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import {
  VenueOwnerOverview,
  type VenueOwnerBooking,
} from "@/components/dashboard/enterprise";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = (members ?? []).map((m: { organization_id: string }) => m.organization_id);

  const { data: orgs } = await supabase
    .from("organizations")
    .select("name")
    .in("id", orgIds.length ? orgIds : ["__none__"])
    .limit(1);

  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, avg_rating, status")
    .in("organization_id", orgIds.length ? orgIds : ["__none__"]);
  const venueIds = (venues ?? []).map((v: { id: string }) => v.id);

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select(
      "id, event_date, status, total_amount, guest_count, venues(name), profiles!customer_id(full_name)",
    )
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .order("event_date", { ascending: false })
    .limit(10);

  const bookingCount = bookingsRaw?.length ?? 0;
  const pendingCount =
    bookingsRaw?.filter((b: { status: string }) => b.status === "pending").length ?? 0;
  const monthlyRevenue = (bookingsRaw ?? [])
    .filter(
      (b: { status: string; total_amount: number | null }) =>
        b.status === "approved" || b.status === "completed",
    )
    .reduce(
      (sum: number, b: { total_amount: number | null }) =>
        sum + (Number(b.total_amount) || 0),
      0,
    );

  const ratings = (venues ?? [])
    .map((v: { avg_rating: number }) => v.avg_rating)
    .filter((r: number) => r > 0);
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
          ((publishedVenues.length / venues.length) * 60 +
            (avgRating != null ? 20 : 0) +
            (bookingCount > 0 ? 20 : 0)) ,
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
      revenue: b.total_amount
        ? `₱${Number(b.total_amount).toLocaleString()}`
        : "—",
      status:
        b.status === "approved"
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
