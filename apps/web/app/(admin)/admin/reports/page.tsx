import type { Metadata } from "next";
import {
  DashboardSubPage,
  DemographicsBarChart,
  KpiCard,
  Panel,
  PanelHeader,
  RevenueTrendChart,
  StatusDistributionChart,
  TopItemsBarChart,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import {
  getBookingDemographics,
  getConversionRate,
  getOccupancyRate,
  getRevenueTrend,
  getTopPackages,
  getCommissionTrend,
  lastNMonthsRange,
} from "@/features/analytics/application/queries";
import { AnalyticsExportActions } from "@/features/analytics/ui/AnalyticsExportActions";
import {
  requirePermissionOrRedirect,
  hasPermission,
} from "@/lib/rbac/admin-context";
import { ReportsFilterClient } from "./ReportsFilterClient";

export const metadata: Metadata = { title: "Reports - Admin" };
export const dynamic = "force-dynamic";

function formatPeso(amount: number) {
  return `PHP ${Math.round(amount).toLocaleString()}`;
}

export default async function AdminReportsPage(props: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const searchParams = await props.searchParams;
  await requirePermissionOrRedirect("reports.view");
  const canExport = await hasPermission("reports.export");
  const supabase = (await createClient()) as any;

  const defaultRange = lastNMonthsRange(12);
  const range = {
    from: searchParams.from || defaultRange.from,
    to: searchParams.to || defaultRange.to,
  };

  const [
    { count: venueCount },
    { count: bookingCount },
    { count: supplierCount },
    { count: customerCount },
  ] = await Promise.all([
    supabase.from("venues").select("id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("event_date", range.from)
      .lte("event_date", range.to),
    supabase
      .from("supplier_profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer"),
  ]);

  // For booking status distribution on platform
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("status")
    .gte("event_date", range.from)
    .lte("event_date", range.to);

  const bookings = (bookingsRaw as { status: string }[]) || [];
  const statusCounts = bookings.reduce((acc: Record<string, number>, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusDistribution = Object.entries(statusCounts).map(
    ([status, count]) => ({ status, count: count as number }),
  );

  const scope = { kind: "platform" as const };
  
  const [
    revenueTrend,
    commissionTrend,
    occupancy,
    conversion,
    topPackages,
    demographics,
  ] = await Promise.all([
    getRevenueTrend(supabase, scope, range),
    getCommissionTrend(supabase, range),
    getOccupancyRate(supabase, scope, range),
    getConversionRate(supabase, scope, range),
    getTopPackages(supabase, scope, range),
    getBookingDemographics(supabase, scope, range),
  ]);

  const totalRevenue = revenueTrend.reduce(
    (sum, point) => sum + point.revenue,
    0,
  );
  
  const totalCommission = commissionTrend.reduce(
    (sum, point) => sum + point.revenue,
    0,
  );

  return (
    <DashboardSubPage
      title="Reports"
      description="Platform-wide performance across every venue, booking, and supplier."
      {...(canExport
        ? {
            action: (
              <AnalyticsExportActions
                range={range}
                endpoint="/api/admin/reports/export"
              />
            ),
          }
        : {})}
    >
      <ReportsFilterClient />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <KpiCard
          label="Total Revenue"
          value={formatPeso(totalRevenue)}
          icon="payments"
          highlight
        />
        <KpiCard
          label="Commissions"
          value={formatPeso(totalCommission)}
          icon="account_balance_wallet"
        />
        <KpiCard
          label="Bookings"
          value={String(bookingCount ?? 0)}
          icon="event_available"
        />
        <KpiCard
          label="Customers"
          value={String(customerCount ?? 0)}
          icon="groups"
        />
        <KpiCard
          label="Venues"
          value={String(venueCount ?? 0)}
          icon="location_city"
        />
        <KpiCard
          label="Suppliers"
          value={String(supplierCount ?? 0)}
          icon="storefront"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2 mb-6">
        <Panel>
          <PanelHeader
            title="Platform Revenue"
            description="Gross booking revenue across every venue, from approved, confirmed, and completed bookings."
          />
          <RevenueTrendChart data={revenueTrend} format="currency" />
        </Panel>
        <Panel>
          <PanelHeader
            title="Platform Commission"
            description="Actual commissions collected from paid platform transactions."
          />
          <RevenueTrendChart data={commissionTrend} format="currency" />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] mb-6">
        <Panel>
          <PanelHeader
            title="Top Packages"
            description="The most-booked packages across the entire platform."
          />
          <TopItemsBarChart data={topPackages} />
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

      <div className="grid gap-6 mb-6">
        <Panel>
          <PanelHeader
            title="Customer Demographics"
            description="Event type mix and guest count distribution across all bookings."
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
          title="More reports"
          description="Other report categories live on their own admin pages, or aren't available yet."
        />
        <ul className="grid gap-2 text-sm text-[#475569] sm:grid-cols-2">
          <li>
            • User registrations, verification &amp; suspensions —{" "}
            <a
              href="/admin/users"
              className="font-semibold text-[#1d4ed8] hover:underline"
            >
              Users
            </a>
          </li>
          <li>
            • Venue approvals &amp; review history —{" "}
            <a
              href="/admin/venues"
              className="font-semibold text-[#1d4ed8] hover:underline"
            >
              Venues
            </a>
          </li>
          <li>
            • Supplier accreditation &amp; review history —{" "}
            <a
              href="/admin/suppliers"
              className="font-semibold text-[#1d4ed8] hover:underline"
            >
              Suppliers
            </a>
          </li>
          <li>
            • Commission rules &amp; trend —{" "}
            <a
              href="/admin/commissions"
              className="font-semibold text-[#1d4ed8] hover:underline"
            >
              Commissions
            </a>
          </li>
          <li>
            • Marketplace cases, cancellations, refunds —{" "}
            <a
              href="/admin/marketplace"
              className="font-semibold text-[#1d4ed8] hover:underline"
            >
              Marketplace
            </a>
          </li>
          <li>
            • Administrator &amp; audit activity —{" "}
            <a
              href="/admin/audit-logs"
              className="font-semibold text-[#1d4ed8] hover:underline"
            >
              Audit Logs
            </a>
          </li>
          <li className="text-[#6b7280]">
            • AI usage reporting — not available yet (no usage tracking exists;
            planned for AI Configuration)
          </li>
          <li className="text-[#6b7280]">
            • System error reporting — not available yet (no error-tracking
            table exists)
          </li>
        </ul>
      </Panel>
    </DashboardSubPage>
  );
}
