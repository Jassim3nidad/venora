import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  DashboardPage,
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
  const { supabase, supplierProfile, profile } =
    await getSupplierDashboardContext();

  if (!supplierProfile) {
    return (
      <DashboardPage className="flex flex-col gap-6">
        <div className="mb-2 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl flex-1">
            <h1 className="text-3xl font-black tracking-tight text-[#0f172a]">
              Analytics
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#475569]">
              Set up your supplier profile first.
            </p>
          </div>
        </div>
        <EmptyState
          icon="trending_up"
          title="Profile setup pending"
          description="Create your supplier profile from the overview page to unlock analytics."
        />
      </DashboardPage>
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
  const [revenueTrend, conversion, topPackages, demographics] =
    await Promise.all([
      getRevenueTrend(supabase, scope, range),
      getConversionRate(supabase, scope, range),
      getTopPackages(supabase, scope, range),
      getBookingDemographics(supabase, scope, range),
    ]);

  const rows = (bookingSupsRaw ?? []) as BookingSupplierRow[];
  const confirmed = rows.filter((r) => r.status === "confirmed");
  const pending = rows.filter((r) => r.status === "pending");
  const cancelled = rows.filter((r) => r.status === "cancelled");

  const totalRevenue = confirmed.reduce(
    (sum, r) => sum + (Number(r.agreed_price) || 0),
    0,
  );
  const acceptanceRate =
    confirmed.length + cancelled.length > 0
      ? Math.round(
          (confirmed.length / (confirmed.length + cancelled.length)) * 100,
        )
      : null;

  return (
    <DashboardPage className="flex flex-col gap-6">
      <div className="mb-2 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl flex-1">
          <h1 className="text-3xl font-black tracking-tight text-[#0f172a]">
            Analytics
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#475569]">
            Track inquiry performance, revenue, customer demand, and service
            health across your supplier profile.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={formatPeso(totalRevenue)}
          icon="payments"
          highlight
        />
        <KpiCard
          label="Confirmed Bookings"
          value={String(confirmed.length)}
          icon="event_available"
        />
        <KpiCard
          label="Pending Inquiries"
          value={String(pending.length)}
          icon="mail"
        />
        <KpiCard
          label="Conversion Rate"
          value={conversion ? `${conversion.rate}%` : "-"}
          icon="trending_up"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Services"
          value={String(servicesCount ?? 0)}
          icon="design_services"
        />
        <KpiCard
          label="Total Inquiries"
          value={String(inquiryCount ?? 0)}
          icon="mail"
        />
        <KpiCard
          label="Quotes Created"
          value={String(quoteCount ?? 0)}
          icon="request_quote"
        />
        <KpiCard
          label="Average Rating"
          value={profile?.avgRating ? profile.avgRating.toFixed(1) : "-"}
          icon="star"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <PanelHeader
            title="Performance over time"
            description="Revenue from confirmed bookings only."
          />
          <RevenueTrendChart data={revenueTrend} format="currency" />
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHeader
              title="Attention needed"
              description="Items requiring your action."
            />
            <div className="space-y-3">
              {pending.length > 0 ? (
                <Link
                  href="/dashboard/supplier/inquiries"
                  className="group flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 transition hover:bg-amber-100"
                >
                  <div className="flex items-center gap-3 text-amber-900">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium">
                      {pending.length} pending{" "}
                      {pending.length === 1 ? "inquiry" : "inquiries"}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-amber-600 opacity-50 transition group-hover:opacity-100" />
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">
                    You are all caught up. No urgent inquiries.
                  </span>
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Supplier Health"
              description="A quick view of response outcomes."
            />
            <div className="space-y-4">
              <div className="rounded-[22px] border border-[#e5e7eb] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm shadow-slate-200/60">
                <p className="text-xs font-black uppercase tracking-wider text-[#64748b]">
                  Acceptance Rate
                </p>
                <p className="mt-2 font-display text-3xl font-black tracking-tight text-[#0f172a]">
                  {acceptanceRate != null ? `${acceptanceRate}%` : "-"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[#e5e7eb] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm shadow-slate-200/60">
                <p className="text-xs font-black uppercase tracking-wider text-[#64748b]">
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
                    <span className="text-sm text-[#64748b]">
                      No inquiries yet.
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </Panel>
        </div>
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
            <DemographicsBarChart
              data={demographics?.guestCountBuckets ?? []}
            />
          </div>
        </Panel>
      </div>
    </DashboardPage>
  );
}
