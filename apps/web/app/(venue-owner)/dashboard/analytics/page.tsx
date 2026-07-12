import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import {
  DashButton,
  DashboardSubPage,
  DemographicsBarChart,
  EmptyState,
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
} from "../_lib/owner-dashboard-data";
import {
  getBookingDemographics,
  getBookingDemandHeatmap,
  getConversionRate,
  getCustomerGrowth,
  getMonthlyReports,
  getOccupancyRate,
  getPopularVenues,
  getRevenueTrend,
  getTopPackages,
  lastNMonthsRange,
} from "@/features/analytics/application/queries";
import { AnalyticsExportActions } from "@/features/analytics/ui/AnalyticsExportActions";
import { BookingDemandHeatmap } from "@/features/analytics/ui/BookingDemandHeatmap";
import { MonthlyReportsTable } from "@/features/analytics/ui/MonthlyReportsTable";

const BookingsTrendChart = nextDynamic(() =>
  import("@/features/analytics/ui/BookingsTrendChart").then((m) => m.BookingsTrendChart),
);
const CustomerGrowthChart = nextDynamic(() =>
  import("@/features/analytics/ui/CustomerGrowthChart").then((m) => m.CustomerGrowthChart),
);
import { PopularVenuesTable } from "@/features/analytics/ui/PopularVenuesTable";

export const metadata: Metadata = { title: "Analytics - Dashboard" };
export const dynamic = "force-dynamic";

type AnalyticsBooking = {
  id: string;
  event_date: string;
  status: string;
  total_amount: number | null;
};

type AnalyticsVenue = {
  id: string;
  status: string;
  avg_rating: number;
  review_count: number;
};

export default async function AnalyticsPage() {
  const context = await getOwnerDashboardContext();
  const { supabase, orgIds } = context;
  const orgScopedContext = { ...context, isAdmin: false };

  const venuesQuery = supabase
    .from("venues")
    .select("id, status, avg_rating, review_count")
    .in("organization_id", orgIds);

  const { data: venues } =
    orgIds.length > 0 ? await venuesQuery : { data: [] };

  const venueIds = await getOwnerVenueIds(orgScopedContext);
  const { data: bookings } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select("id, event_date, status, total_amount")
          .in("venue_id", venueIds)
          .order("event_date", { ascending: false })
      : { data: [] };

  const scope = { kind: "venues" as const, venueIds };
  const range = lastNMonthsRange(12);
  const [
    revenueTrend,
    occupancy,
    conversion,
    topPackages,
    demographics,
    customerGrowth,
    popularVenues,
    bookingHeatmap,
    monthlyReports,
  ] = await Promise.all([
    getRevenueTrend(supabase, scope, range),
    getOccupancyRate(supabase, scope),
    getConversionRate(supabase, scope, range),
    getTopPackages(supabase, scope, range),
    getBookingDemographics(supabase, scope, range),
    getCustomerGrowth(supabase, scope, range),
    getPopularVenues(supabase, scope, range),
    getBookingDemandHeatmap(supabase, scope, range),
    getMonthlyReports(supabase, scope, range),
  ]);

  const venueRows = (venues ?? []) as AnalyticsVenue[];
  const bookingRows = (bookings ?? []) as AnalyticsBooking[];
  const revenueBookings = bookingRows.filter((booking) =>
    ["approved", "confirmed", "completed"].includes(booking.status),
  );
  const totalRevenue = revenueBookings.reduce(
    (sum, booking) => sum + (Number(booking.total_amount) || 0),
    0,
  );
  const pendingBookings = bookingRows.filter(
    (booking) => booking.status === "pending",
  ).length;
  const publishedVenues = venueRows.filter(
    (venue) => venue.status === "published",
  ).length;
  const ratedVenues = venueRows.filter(
    (venue) => venue.review_count > 0 && venue.avg_rating > 0,
  );
  const avgRating =
    ratedVenues.length > 0
      ? ratedVenues.reduce((sum, venue) => sum + Number(venue.avg_rating), 0) /
        ratedVenues.length
      : null;
  const latestCustomerGrowth = customerGrowth[customerGrowth.length - 1];
  const totalCustomers = latestCustomerGrowth?.totalCustomers ?? 0;

  return (
    <DashboardSubPage
      title="Analytics"
      description="Venue performance, revenue, bookings, customer growth, conversion, demand heatmaps, and monthly reports."
      action={<AnalyticsExportActions range={range} />}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <KpiCard
          label="Total Revenue"
          value={formatPeso(totalRevenue)}
          icon="payments"
          highlight
        />
        <KpiCard
          label="Total Bookings"
          value={String(bookingRows.length)}
          icon="event_available"
        />
        <KpiCard
          label="Customers"
          value={String(totalCustomers)}
          icon="group"
        />
        <KpiCard
          label="Pending Requests"
          value={String(pendingBookings)}
          icon="pending_actions"
        />
        <KpiCard
          label="Avg. Rating"
          value={avgRating != null ? avgRating.toFixed(1) : "-"}
          icon="star"
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

      {venueIds.length === 0 ? (
        <EmptyState
          icon="analytics"
          title="No venues to analyze yet"
          description="Analytics will populate once your organization has venues and booking activity."
          action={
            <DashButton href="/dashboard/venues/new" icon="add_business">
              Add Venue
            </DashButton>
          }
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <PanelHeader
            title="Revenue Overview"
            description="Revenue from approved, confirmed, and completed bookings."
          />
          <RevenueTrendChart data={revenueTrend} format="currency" />
        </Panel>

        <Panel>
          <PanelHeader
            title="Listing Health"
            description="A quick view of venue readiness across your portfolio."
          />
          <div className="space-y-4">
            <div className="rounded-[22px] border border-[#e5e7eb] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm shadow-slate-200/60">
              <p className="text-xs font-black uppercase tracking-wider text-[#64748b]">
                Published Venues
              </p>
              <p className="mt-2 font-display text-3xl font-black tracking-tight text-[#0f172a]">
                {publishedVenues}/{venueRows.length}
              </p>
            </div>
            <div className="rounded-[22px] border border-[#e5e7eb] bg-white p-4 shadow-sm shadow-slate-200/60">
              <p className="text-xs font-black uppercase tracking-wider text-[#64748b]">
                Booking Status Mix
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "pending",
                  "approved",
                  "confirmed",
                  "completed",
                  "cancelled",
                ].map((status) => {
                  const count = bookingRows.filter(
                    (booking) => booking.status === status,
                  ).length;
                  return count > 0 ? (
                    <StatusBadge
                      key={status}
                      status={status}
                      label={`${status.replace(/_/g, " ")}: ${count}`}
                    />
                  ) : null;
                })}
                {bookingRows.length === 0 ? (
                  <span className="text-sm text-[#6b7280]">
                    No bookings yet.
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Bookings by Month"
            description="Monthly booking volume across your venue portfolio."
          />
          <BookingsTrendChart data={revenueTrend} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Customer Growth"
            description="New and cumulative customers based on accepted bookings."
          />
          <CustomerGrowthChart data={customerGrowth} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel>
          <PanelHeader
            title="Booking Demand Heatmap"
            description="Accepted booking concentration by month and day of week."
          />
          <BookingDemandHeatmap data={bookingHeatmap} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Popular Venues"
            description="Venues ranked by accepted booking demand."
          />
          <PopularVenuesTable venues={popularVenues} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Top Packages"
            description="Your most-booked packages across all venues."
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

      <Panel>
        <PanelHeader
          title="Monthly Reports"
          description="Revenue, booking volume, customer count, conversion, average booking value, and top venue by month."
        />
        <MonthlyReportsTable rows={monthlyReports} />
      </Panel>
    </DashboardSubPage>
  );
}
