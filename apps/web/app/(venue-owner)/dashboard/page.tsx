import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { VenueOwnerOverview } from "@/components/dashboard/enterprise";

export const metadata = {
  title: "Venue Owner Dashboard",
  description:
    "Manage venue profiles, bookings, packages, staff, and business analytics.",
};

export default async function VenueOwnerDashboardPage() {
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
  const orgIds = (members ?? []).map((m: any) => m.organization_id);

  const { data: venues } = await supabase
    .from("venues")
    .select("id")
    .in("organization_id", orgIds.length ? orgIds : ["__none__"]);
  const venueIds = (venues ?? []).map((v: any) => v.id);

  const { count: activeBookings } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .in("status", ["pending", "approved"]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  ).toISOString();

  const { data: monthBookings } = await supabase
    .from("bookings")
    .select("total_amount")
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .in("status", ["approved", "completed"])
    .gte("event_date", startOfMonth)
    .lte("event_date", endOfMonth);

  const monthlyRevenue = (monthBookings ?? []).reduce(
    (sum: number, b: any) => sum + (b.total_amount ?? 0),
    0,
  );

  const firstName =
    profile?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  return (
    <VenueOwnerOverview
      userName={firstName}
      revenueMtd={`₱${monthlyRevenue.toLocaleString()}`}
      activeBookings={activeBookings ?? 0}
    />
  );
}
