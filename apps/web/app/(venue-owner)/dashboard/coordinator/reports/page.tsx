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
import { ReportsFilterClient } from "./ReportsFilterClient";

export const metadata: Metadata = { title: "Reports - Coordinator Dashboard" };
export const dynamic = "force-dynamic";

type ReportBooking = {
  id: string;
  event_date: string;
  status: string;
  total_amount: number | null;
  venue_id: string;
  venues: { id: string; name: string } | null;
};

export default async function CoordinatorReportsPage(props: {
  searchParams: Promise<{ venue?: string; from?: string; to?: string }>;
}) {
  const searchParams = await props.searchParams;
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("generate_operational_reports", context);
  const { supabase } = context;
  const assignedVenueIds = await getOwnerVenueIds(context);

  // 1. Process searchParams for Date and Venue filtering
  let venueIds = assignedVenueIds;
  if (searchParams.venue && searchParams.venue !== "all") {
    if (assignedVenueIds.includes(searchParams.venue)) {
      venueIds = [searchParams.venue];
    }
  }

  const defaultRange = lastNMonthsRange(12);
  const range = {
    from: searchParams.from || defaultRange.from,
    to: searchParams.to || defaultRange.to,
  };

  const scope = { kind: "venues" as const, venueIds };

  // Get venues info for the filter dropdown
  const { data: venuesRaw } = assignedVenueIds.length > 0
    ? await supabase.from("venues").select("id, name").in("id", assignedVenueIds).order("name")
    : { data: [] };
  const filterVenues = (venuesRaw ?? []).map((v: any) => ({ id: v.id, name: v.name }));

  // 2. Fetch scoped bookings for the selected range and venue
  const { data: bookingsRaw } = venueIds.length > 0
    ? await supabase
        .from("bookings")
        .select("id, event_date, status, total_amount, venue_id, venues(id, name)")
        .in("venue_id", venueIds)
        .gte("event_date", range.from)
        .lte("event_date", range.to)
        .order("event_date", { ascending: false })
    : { data: [] };

  const [revenueTrend, occupancy, conversion, topPackages, demographics] =
    await Promise.all([
      getRevenueTrend(supabase, scope, range),
      getOccupancyRate(supabase, scope, range),
      getConversionRate(supabase, scope, range),
      getTopPackages(supabase, scope, range),
      getBookingDemographics(supabase, scope, range),
    ]);

  const bookings = (bookingsRaw ?? []) as ReportBooking[];
  
  // Basic KPIs
  const revenueBookings = bookings.filter((b) => ["approved", "confirmed", "completed"].includes(b.status));
  const totalRevenue = revenueBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;

  // Upcoming Workload (events in the future that are approved/confirmed)
  const todayStr = new Date().toISOString().split("T")[0] ?? "";
  const upcomingWorkload = bookings.filter(
    (b) => ["approved", "payment_pending", "confirmed"].includes(b.status) && b.event_date >= todayStr
  ).length;

  // Booking Status Distribution
  const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Top Venues Activity
  const eventsByVenue = bookings.reduce<Record<string, { name: string; count: number }>>((acc, b) => {
    const name = b.venues?.name ?? "Venue";
    const key = b.venue_id;
    if (!acc[key]) acc[key] = { name, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {});
  const topVenues = Object.values(eventsByVenue).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <DashboardSubPage
      title="Performance & Reports"
      description="Coordination performance across the venues and events you manage."
    >
      <ReportsFilterClient venues={filterVenues} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <KpiCard
          label="Total Revenue"
          value={formatPeso(totalRevenue)}
          icon="payments"
          highlight
        />
        <KpiCard
          label="Assigned Bookings"
          value={String(bookings.length)}
          icon="event"
        />
        <KpiCard
          label="Upcoming Workload"
          value={String(upcomingWorkload)}
          icon="calendar_month"
        />
        <KpiCard
          label="Pending Requests"
          value={String(pendingCount)}
          icon="pending_actions"
        />
        <KpiCard
          label="Conversion Rate"
          value={conversion ? `${conversion.rate}%` : "-"}
          icon="trending_up"
        />
        <KpiCard
          label="Cancellations"
          value={String(cancelledCount)}
          icon="cancel"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3 mb-6">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Revenue by Month"
            description="Revenue from approved, confirmed, and completed bookings in the selected period."
          />
          <RevenueTrendChart data={revenueTrend} format="currency" />
        </Panel>

        <Panel>
          <PanelHeader
            title="Booking Status Distribution"
            description="Breakdown of event statuses for the selected filters."
          />
          <div className="mt-4">
            {statusDistribution.length > 0 ? (
              <StatusDistributionChart data={statusDistribution} />
            ) : (
              <p className="text-sm text-[#6b7280]">No bookings found.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] mb-6">
        <Panel>
          <PanelHeader
            title="Top Packages"
            description="The most-booked packages across the venues you manage."
          />
          <TopItemsBarChart data={topPackages} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Top Venues by Events"
            description="Venues generating the most coordination activity."
          />
          {topVenues.length > 0 ? (
            <div className="space-y-3 mt-4">
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
    </DashboardSubPage>
  );
}
