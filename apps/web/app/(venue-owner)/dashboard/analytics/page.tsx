import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import {
  DashButton,
  DashboardSubPage,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  RevenueTrendChart,
  StatusBadge,
  TopItemsBarChart,
  DemographicsBarChart,
} from "@/components/dashboard/enterprise";
import { formatPeso, getOwnerDashboardContext } from "../_lib/owner-dashboard-data";
import { getVenueOwnerAnalytics } from "@/features/analytics/application/get-venue-owner-analytics";
import { AnalyticsHeader } from "@/features/analytics/ui/AnalyticsHeader";
import { BookingDemandHeatmap } from "@/features/analytics/ui/BookingDemandHeatmap";
import { MonthlyReportsTable } from "@/features/analytics/ui/MonthlyReportsTable";
import { PopularVenuesTable } from "@/features/analytics/ui/PopularVenuesTable";
import Link from "next/link";
import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";

const BookingsTrendChart = nextDynamic(() =>
  import("@/features/analytics/ui/BookingsTrendChart").then((m) => m.BookingsTrendChart)
);
const CustomerGrowthChart = nextDynamic(() =>
  import("@/features/analytics/ui/CustomerGrowthChart").then((m) => m.CustomerGrowthChart)
);

export const metadata: Metadata = { title: "Analytics - Dashboard" };
export const dynamic = "force-dynamic";

type AnalyticsPageProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const context = await getOwnerDashboardContext();
  const orgScopedContext = { ...context, isAdmin: false };
  
  const venueParam = typeof searchParams.venue === "string" ? searchParams.venue : "all";
  const periodParam = typeof searchParams.period === "string" ? searchParams.period : "last_12_months";
  const compareParam = typeof searchParams.compare === "string" ? searchParams.compare : "previous_period";

  const data = await getVenueOwnerAnalytics({
    supabase: context.supabase,
    context: orgScopedContext,
    venueParam,
    periodParam,
    compareParam,
  });

  const { 
    venues,
    venueRows,
    range,
    kpis,
    revenueTrend,
    conversion,
    occupancy,
    topPackages,
    demographics,
    customerGrowth,
    popularVenues,
    bookingHeatmap,
    monthlyReports,
  } = data;

  // Format venues for dropdown
  const headerVenues = venueRows.map((v: any) => ({ id: v.id, name: v.name }));

  const hasVenues = venues.length > 0;
  
  const avgBookingValue = kpis.totalAcceptedBookings > 0 
    ? Math.round(kpis.totalRevenue / kpis.totalAcceptedBookings) 
    : 0;

  const compareRevenueDiff = kpis.compareKPIs 
    ? ((kpis.totalRevenue - kpis.compareKPIs.revenue) / Math.max(1, kpis.compareKPIs.revenue)) * 100 
    : null;
    
  const compareBookingsDiff = kpis.compareKPIs 
    ? ((kpis.totalBookings - kpis.compareKPIs.bookings) / Math.max(1, kpis.compareKPIs.bookings)) * 100 
    : null;

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsHeader 
        venues={headerVenues}
        defaultVenue={venueParam}
        defaultPeriod={periodParam}
        defaultCompare={compareParam}
        range={range}
      />

      {!hasVenues ? (
        <EmptyState
          icon="analytics"
          title="No venues available"
          description="Create or publish a venue to begin tracking analytics."
          action={
            <DashButton href="/dashboard/venues/new" icon="add_business">
              Manage Venues
            </DashButton>
          }
        />
      ) : (
        <>
          {/* Primary KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Booked Value"
              value={formatPeso(kpis.totalRevenue)}
              icon="payments"
              trend={compareRevenueDiff != null ? { value: compareRevenueDiff, label: "vs previous period" } : undefined}
              highlight
            />
            <KpiCard
              label="Accepted Bookings"
              value={String(kpis.totalAcceptedBookings)}
              icon="event_available"
              trend={compareBookingsDiff != null ? { value: compareBookingsDiff, label: "vs previous period" } : undefined}
            />
            <KpiCard
              label="Occupancy Rate"
              value={kpis.occupancy ? `${kpis.occupancy}%` : "-"}
              icon="event_seat"
              tooltip="Percentage of available dates booked in the selected period."
            />
            <KpiCard
              label="Conversion Rate"
              value={kpis.conversion ? `${kpis.conversion}%` : "-"}
              icon="trending_up"
              tooltip="Percentage of incoming requests that are approved or confirmed."
            />
          </div>

          {/* Secondary KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Unique Customers"
              value={String(kpis.totalCustomers)}
              icon="group"
            />
            <KpiCard
              label="Pending Requests"
              value={String(kpis.pendingRequests)}
              icon="pending_actions"
            />
            <KpiCard
              label="Average Booking Value"
              value={formatPeso(avgBookingValue)}
              icon="receipt"
            />
            <KpiCard
              label="Average Rating"
              value={kpis.avgRating != null ? kpis.avgRating.toFixed(1) : "No reviews yet"}
              icon="star"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Panel>
              <PanelHeader
                title="Performance over time"
                description="Revenue from approved, confirmed, and completed bookings."
              />
              <RevenueTrendChart data={revenueTrend} format="currency" />
            </Panel>

            <div className="flex flex-col gap-6">
              {/* Attention Needed */}
              <Panel>
                <PanelHeader
                  title="Attention needed"
                  description="Items requiring your action."
                />
                <div className="space-y-3">
                  {kpis.pendingRequests > 0 ? (
                    <Link href="/dashboard/bookings" className="group flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 transition">
                      <div className="flex items-center gap-3 text-amber-900">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <span className="text-sm font-medium">{kpis.pendingRequests} pending booking {kpis.pendingRequests === 1 ? 'request' : 'requests'}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-amber-600 opacity-50 group-hover:opacity-100 transition" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium">You’re all caught up! No urgent issues.</span>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Listing Health */}
              <Panel>
                <PanelHeader
                  title="Listing Health"
                  description="A quick view of venue readiness."
                />
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-[#e5e7eb] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm shadow-slate-200/60">
                    <p className="text-xs font-black uppercase tracking-wider text-[#64748b]">
                      Published Venues
                    </p>
                    <p className="mt-2 font-display text-3xl font-black tracking-tight text-[#0f172a]">
                      {kpis.publishedVenues}/{venueRows.length}
                    </p>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Customer Growth"
                description="New and cumulative customers based on accepted bookings."
              />
              <CustomerGrowthChart data={customerGrowth} />
            </Panel>

            <Panel>
              <PanelHeader
                title="Booking Demand"
                description="Accepted events by month and day of week."
              />
              <BookingDemandHeatmap data={bookingHeatmap} />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Popular Venues"
                description="Venues ranked by accepted booking demand."
              />
              <PopularVenuesTable venues={popularVenues} />
            </Panel>
            
            <Panel>
              <PanelHeader
                title="Top Packages"
                description="Your most-booked packages across all venues."
              />
              <TopItemsBarChart data={topPackages} />
            </Panel>
          </div>
          
          <div className="grid gap-6">
            <Panel>
              <PanelHeader
                title="Event Insights"
                description="Customer and event demographics for the selected period."
              />
              <div className="grid gap-6 md:grid-cols-2">
                <DemographicsBarChart
                  data={demographics?.eventTypeMix ?? []}
                  title="Event types"
                />
                <DemographicsBarChart
                  data={demographics?.guestCountBuckets ?? []}
                  title="Guest count"
                />
              </div>
            </Panel>
          </div>
          
          <div className="grid gap-6">
            <Panel>
              <PanelHeader
                title="Monthly Report"
                description="Aggregated performance by month."
              />
              <MonthlyReportsTable data={monthlyReports} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
