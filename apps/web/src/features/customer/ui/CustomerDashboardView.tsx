import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { CustomerPageHeader } from "@/src/components/customer/CustomerUI";
import {
  KpiCard,
  Panel,
  PanelHeader,
  RevenueTrendChart,
  StatusDistributionChart,
  TopItemsBarChart,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import {
  getRevenueTrend,
  getTopPackages,
  lastNMonthsRange,
} from "@/features/analytics/application/queries";

const ACCEPTED_BOOKING_STATUSES = ["approved", "confirmed", "completed"];
const CLOSED_BOOKING_STATUSES = ["cancelled", "declined", "expired"];

function formatPeso(amount: number) {
  return `PHP ${Math.round(amount).toLocaleString()}`;
}

export async function CustomerDashboardView() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/account/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const [
    { data: bookings },
    { count: favoritesCount },
    revenueTrend,
    topVenues,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, status, total_amount, event_date")
      .eq("customer_id", user.id),
    supabase
      .from("favorites")
      .select("venue_id", { count: "exact", head: true })
      .eq("customer_id", user.id),
    getRevenueTrend(
      supabase,
      { kind: "customer", customerId: user.id },
      lastNMonthsRange(12),
    ),
    getTopPackages(supabase, { kind: "customer", customerId: user.id }),
  ]);

  const bookingRows = (bookings ?? []) as {
    id: string;
    status: string;
    total_amount: number | null;
    event_date: string;
  }[];

  const totalBookings = bookingRows.length;
  const totalSpent = bookingRows
    .filter((booking) => ACCEPTED_BOOKING_STATUSES.includes(booking.status))
    .reduce((sum, booking) => sum + (Number(booking.total_amount) || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingBookings = bookingRows.filter(
    (booking) =>
      booking.event_date >= today &&
      !CLOSED_BOOKING_STATUSES.includes(booking.status),
  ).length;

  const statusCounts = new Map<string, number>();
  for (const booking of bookingRows) {
    statusCounts.set(booking.status, (statusCounts.get(booking.status) ?? 0) + 1);
  }
  const statusMix = [...statusCounts.entries()].map(([status, count]) => ({
    status,
    count,
  }));

  return (
    <div className="space-y-6">
      <CustomerPageHeader
        eyebrow="Your activity"
        icon={LayoutDashboard}
        title={`Welcome back, ${(profile?.full_name ?? "there").split(" ")[0]}`}
        description="A snapshot of your bookings, spending, and favorites."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Bookings"
          value={String(totalBookings)}
          icon="event_available"
          highlight
        />
        <KpiCard
          label="Total Spent"
          value={formatPeso(totalSpent)}
          icon="payments"
        />
        <KpiCard
          label="Upcoming Bookings"
          value={String(upcomingBookings)}
          icon="calendar_month"
        />
        <KpiCard
          label="Favorites"
          value={String(favoritesCount ?? 0)}
          icon="favorite"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader
            title="Spending Over Time"
            description="Your booking spend, month by month."
          />
          <RevenueTrendChart data={revenueTrend} format="currency" />
        </Panel>

        <Panel>
          <PanelHeader
            title="Booking Status"
            description="Where your bookings currently stand."
          />
          <StatusDistributionChart data={statusMix} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Your Top Venues"
          description="The venues and packages you book most often."
        />
        <TopItemsBarChart data={topVenues} />
      </Panel>
    </div>
  );
}
