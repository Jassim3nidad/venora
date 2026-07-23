import type { Metadata } from "next";
import {
  DashboardSubPage,
  DemographicsBarChart,
  KpiCard,
  Panel,
  PanelHeader,
  RevenueTrendChart,
  StatusBadge,
  StatusDistributionChart,
  TopItemsBarChart,
} from "@/components/dashboard/enterprise";
import {
  formatPeso,
  getOwnerDashboardContext,
  getOwnerVenueIds,
  requireCoordinatorPermission,
} from "@/lib/dashboard/org-dashboard-data";
import {
  getBookingDemographics,
  getConversionRate,
  getOccupancyRate,
  getRevenueTrend,
  getTopPackages,
  lastNMonthsRange,
} from "@/features/analytics/application/queries";

export const metadata: Metadata = { title: "Reports - Coordinator Dashboard" };
export const dynamic = "force-dynamic";

type ReportBooking = {
  id: string;
  event_date: string;
  status: string;
  total_amount: number | null;
  venue_id: string;
  venues: { name: string } | null;
};

export default async function CoordinatorReportsPage() {
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("generate_operational_reports", context);
  const { supabase } = context;
  const venueIds = await getOwnerVenueIds(context);

  const { data: bookingsRaw } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select(
            "id, event_date, status, total_amount, venue_id, venues(name)",
          )
          .in("venue_id", venueIds)
          .order("event_date", { ascending: false })
      : { data: [] };

  const scope = { kind: "venues" as const, venueIds };
  const range = lastNMonthsRange(12);
  const [revenueTrend, occupancy, conversion, topPackages, demographics] =
    await Promise.all([
      getRevenueTrend(supabase, scope, range),
      getOccupancyRate(supabase, scope),
      getConversionRate(supabase, scope, range),
      getTopPackages(supabase, scope, range),
      getBookingDemographics(supabase, scope, range),
    ]);

  const bookings = (bookingsRaw ?? []) as ReportBooking[];
  const revenueBookings = bookings.filter((b) =>
    ["approved", "confirmed", "completed"].includes(b.status),
  );
  const totalRevenue = revenueBookings.reduce(
    (sum, b) => sum + (Number(b.total_amount) || 0),
    0,
  );
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const completedCount = bookings.filter(
    (b) => b.status === "completed",
  ).length;

  const eventsByVenue = bookings.reduce<
    Record<string, { name: string; count: number }>
  >((acc, b) => {
    const name = b.venues?.name ?? "Venue";
    const key = b.venue_id;
    if (!acc[key]) acc[key] = { name, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {});
  const topVenues = Object.values(eventsByVenue)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <DashboardSubPage
      title="Reports"
      description="Coordination performance across the venues and events you manage."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Revenue"
          value={formatPeso(totalRevenue)}
          icon="payments"
          highlight
        />
        <KpiCard
          label="Total Events"
          value={String(bookings.length)}
          icon="celebration"
        />
        <KpiCard
          label="Pending Requests"
          value={String(pendingCount)}
          icon="pending_actions"
        />
        <KpiCard
          label="Completed Events"
          value={String(completedCount)}
          icon="task_alt"
        />
        <KpiCard
          label="Occupancy Rate"
          value={occupancy ? `${occupancy.rate}%` : "-"}
          icon="event_seat"
        />
        <KpiCard
          label="Conversion Rate"
          value={conversion ? `${conversion.rate}%` : "-"}
          icon="trending_up"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader
            title="Revenue by Month"
            description="Revenue from approved, confirmed, and completed bookings."
          />
          <RevenueTrendChart data={revenueTrend} format="currency" />
        </Panel>

        <Panel>
          <PanelHeader
            title="Top Venues by Events"
            description="Venues generating the most coordination activity."
          />
          {topVenues.length > 0 ? (
            <div className="space-y-3">
              {topVenues.map((venue) => (
                <div
                  key={venue.name}
                  className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3"
                >
                  <span className="text-sm font-semibold text-[#111827]">
                    {venue.name}
                  </span>
                  <StatusBadge
                    status="active"
                    label={`${venue.count} events`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6b7280]">No event activity yet.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Top Packages"
            description="The most-booked packages across the venues you manage."
          />
          <TopItemsBarChart data={topPackages} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Customer Demographics"
            description="Event type mix and guest count distribution (based on available booking data)."
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <StatusDistributionChart data={demographics?.eventTypeMix ?? []} />
            <DemographicsBarChart
              data={demographics?.guestCountBuckets ?? []}
            />
          </div>
        </Panel>
      </div>
    </DashboardSubPage>
  );
}
