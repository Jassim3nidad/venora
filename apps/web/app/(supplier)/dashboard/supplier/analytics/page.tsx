import type { Metadata } from "next";
import {
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
  getSupplierDashboardContext,
} from "../_lib/supplier-dashboard-data";
import {
  getBookingDemographics,
  getConversionRate,
  getRevenueTrend,
  getTopPackages,
  lastNMonthsRange,
} from "@/features/analytics/application/queries";

export const metadata: Metadata = { title: "Analytics - Supplier Dashboard" };
export const dynamic = "force-dynamic";

type BookingSupplierRow = {
  id: string;
  agreed_price: number | null;
  status: string;
  bookings: { event_date: string } | null;
};

export default async function SupplierAnalyticsPage() {
  const { supabase, supplierProfile, profile } = await getSupplierDashboardContext();

  if (!supplierProfile) {
    return (
      <DashboardSubPage title="Analytics" description="Set up your supplier profile first.">
        <EmptyState
          icon="trending_up"
          title="Profile setup pending"
          description="Create your supplier profile from the overview page to unlock analytics."
        />
      </DashboardSubPage>
    );
  }

  const { data: bookingSupsRaw } = await supabase
    .from("booking_suppliers")
    .select("id, agreed_price, status, bookings(event_date)")
    .eq("supplier_id", supplierProfile.id);

  const { count: servicesCount } = await supabase
    .from("supplier_services")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierProfile.id);

  const [{ count: quoteCount }, { count: inquiryCount }] = await Promise.all([
    supabase
      .from("supplier_quotes")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierProfile.id),
    supabase
      .from("supplier_contact_requests")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierProfile.id),
  ]);

  const scope = { kind: "supplier" as const, supplierId: supplierProfile.id };
  const range = lastNMonthsRange(12);
  const [revenueTrend, conversion, topPackages, demographics] = await Promise.all([
    getRevenueTrend(supabase, scope, range),
    getConversionRate(supabase, scope, range),
    getTopPackages(supabase, scope, range),
    getBookingDemographics(supabase, scope, range),
  ]);

  const rows = (bookingSupsRaw ?? []) as BookingSupplierRow[];
  const confirmed = rows.filter((r) => r.status === "confirmed");
  const pending = rows.filter((r) => r.status === "pending");
  const cancelled = rows.filter((r) => r.status === "cancelled");

  const totalRevenue = confirmed.reduce((sum, r) => sum + (Number(r.agreed_price) || 0), 0);
  const acceptanceRate =
    confirmed.length + cancelled.length > 0
      ? Math.round((confirmed.length / (confirmed.length + cancelled.length)) * 100)
      : null;

  return (
    <DashboardSubPage
      title="Analytics"
      description="Track your inquiry performance and revenue over time."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Revenue" value={formatPeso(totalRevenue)} icon="payments" highlight />
        <KpiCard label="Confirmed Bookings" value={String(confirmed.length)} icon="event_available" />
        <KpiCard label="Pending Inquiries" value={String(pending.length)} icon="mail" />
        <KpiCard label="Active Services" value={String(servicesCount ?? 0)} icon="design_services" />
        <KpiCard label="Total Inquiries" value={String(inquiryCount ?? 0)} icon="mail" />
        <KpiCard label="Quotes Created" value={String(quoteCount ?? 0)} icon="request_quote" />
        <KpiCard label="Average Rating" value={profile?.avgRating ? profile.avgRating.toFixed(1) : "-"} icon="star" />
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
            description="Revenue from confirmed bookings only."
          />
          <RevenueTrendChart data={revenueTrend} format="currency" />
        </Panel>

        <Panel>
          <PanelHeader title="Inquiry Health" description="How you're responding to requests." />
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                Acceptance Rate
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-[#111827]">
                {acceptanceRate != null ? `${acceptanceRate}%` : "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                Inquiry Status Mix
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["pending", pending.length],
                  ["confirmed", confirmed.length],
                  ["cancelled", cancelled.length],
                ].map(([status, count]) =>
                  (count as number) > 0 ? (
                    <StatusBadge
                      key={status as string}
                      status={status as string}
                      label={`${status}: ${count}`}
                    />
                  ) : null,
                )}
                {rows.length === 0 ? (
                  <span className="text-sm text-[#6b7280]">No inquiries yet.</span>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Top Packages"
            description="Your most-booked services."
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
            <DemographicsBarChart data={demographics?.guestCountBuckets ?? []} />
          </div>
        </Panel>
      </div>
    </DashboardSubPage>
  );
}
