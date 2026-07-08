import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  formatPeso,
  getSupplierDashboardContext,
} from "../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Analytics - Supplier Dashboard" };
export const dynamic = "force-dynamic";

type BookingSupplierRow = {
  id: string;
  agreed_price: number | null;
  status: string;
  bookings: { event_date: string } | null;
};

function monthLabel(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { month: "short", year: "numeric" });
}

export default async function SupplierAnalyticsPage() {
  const { supabase, supplierProfile } = await getSupplierDashboardContext();

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

  const rows = (bookingSupsRaw ?? []) as BookingSupplierRow[];
  const confirmed = rows.filter((r) => r.status === "confirmed");
  const pending = rows.filter((r) => r.status === "pending");
  const cancelled = rows.filter((r) => r.status === "cancelled");

  const totalRevenue = confirmed.reduce((sum, r) => sum + (Number(r.agreed_price) || 0), 0);
  const acceptanceRate =
    confirmed.length + cancelled.length > 0
      ? Math.round((confirmed.length / (confirmed.length + cancelled.length)) * 100)
      : null;

  const revenueByMonth = confirmed.reduce<Record<string, number>>((months, r) => {
    if (!r.bookings?.event_date) return months;
    const label = monthLabel(r.bookings.event_date);
    months[label] = (months[label] ?? 0) + (Number(r.agreed_price) || 0);
    return months;
  }, {});
  const monthRows = Object.entries(revenueByMonth).slice(0, 6);

  return (
    <DashboardSubPage
      title="Analytics"
      description="Track your inquiry performance and revenue over time."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Revenue" value={formatPeso(totalRevenue)} icon="payments" highlight />
        <KpiCard label="Confirmed Bookings" value={String(confirmed.length)} icon="event_available" />
        <KpiCard label="Pending Inquiries" value={String(pending.length)} icon="mail" />
        <KpiCard label="Active Services" value={String(servicesCount ?? 0)} icon="design_services" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader
            title="Revenue by Month"
            description="Revenue from confirmed bookings only."
          />
          {monthRows.length > 0 ? (
            <div className="space-y-3">
              {monthRows.map(([label, amount]) => {
                const width =
                  totalRevenue > 0 ? Math.max(8, Math.round((amount / totalRevenue) * 100)) : 0;
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#111827]">{label}</span>
                      <span className="font-bold text-[#1d4ed8]">{formatPeso(amount)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
                      <div
                        className="h-full rounded-full bg-[#1d4ed8]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-[#f9fafb] px-6 py-12 text-center">
              <h3 className="font-display text-lg font-bold text-[#111827]">No revenue yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#4b5563]">
                Revenue analytics will appear once you accept and confirm inquiries.
              </p>
            </div>
          )}
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
    </DashboardSubPage>
  );
}
