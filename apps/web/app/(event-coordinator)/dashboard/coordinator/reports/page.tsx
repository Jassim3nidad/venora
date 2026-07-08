import type { Metadata } from "next";
import {
  DashboardSubPage,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  formatPeso,
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "@/lib/dashboard/org-dashboard-data";

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

function monthLabel(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  });
}

export default async function CoordinatorReportsPage() {
  const context = await getOwnerDashboardContext();
  const { supabase } = context;
  const venueIds = await getOwnerVenueIds(context);

  const { data: bookingsRaw } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select("id, event_date, status, total_amount, venue_id, venues(name)")
          .in("venue_id", venueIds)
          .order("event_date", { ascending: false })
      : { data: [] };

  const bookings = (bookingsRaw ?? []) as ReportBooking[];
  const revenueBookings = bookings.filter((b) =>
    ["approved", "confirmed", "completed"].includes(b.status),
  );
  const totalRevenue = revenueBookings.reduce(
    (sum, b) => sum + (Number(b.total_amount) || 0),
    0,
  );
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  const revenueByMonth = revenueBookings.reduce<Record<string, number>>((months, b) => {
    const label = monthLabel(b.event_date);
    months[label] = (months[label] ?? 0) + (Number(b.total_amount) || 0);
    return months;
  }, {});
  const monthRows = Object.entries(revenueByMonth).slice(0, 6);

  const eventsByVenue = bookings.reduce<Record<string, { name: string; count: number }>>(
    (acc, b) => {
      const name = b.venues?.name ?? "Venue";
      const key = b.venue_id;
      if (!acc[key]) acc[key] = { name, count: 0 };
      acc[key].count += 1;
      return acc;
    },
    {},
  );
  const topVenues = Object.values(eventsByVenue)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <DashboardSubPage
      title="Reports"
      description="Coordination performance across the venues and events you manage."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Revenue" value={formatPeso(totalRevenue)} icon="payments" highlight />
        <KpiCard label="Total Events" value={String(bookings.length)} icon="celebration" />
        <KpiCard label="Pending Requests" value={String(pendingCount)} icon="pending_actions" />
        <KpiCard label="Completed Events" value={String(completedCount)} icon="task_alt" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader
            title="Revenue by Month"
            description="Revenue from approved, confirmed, and completed bookings."
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
                Revenue analytics will appear once approved or completed bookings have a total amount.
              </p>
            </div>
          )}
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
                  <span className="text-sm font-semibold text-[#111827]">{venue.name}</span>
                  <StatusBadge status="active" label={`${venue.count} events`} />
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
