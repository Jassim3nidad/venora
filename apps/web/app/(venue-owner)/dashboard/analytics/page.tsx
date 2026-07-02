import type { Metadata } from "next";
import { DashboardSubPage, KpiCard, Panel } from "@/components/dashboard/enterprise/ui";

export const metadata: Metadata = { title: "Analytics — Dashboard" };

export default function AnalyticsPage() {
  return (
    <DashboardSubPage
      title="Analytics"
      description="Track revenue, bookings, occupancy, and customer satisfaction across your venues."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Revenue" value="₱0" icon="payments" trend="—" trendMuted />
        <KpiCard label="Total Bookings" value="0" icon="event_available" trend="—" trendMuted />
        <KpiCard label="Avg. Rating" value="—" icon="star" />
        <KpiCard label="Occupancy Rate" value="0%" icon="analytics" trend="—" trendMuted />
      </div>

      <Panel className="flex min-h-[320px] flex-col items-center justify-center bg-[#fafbfc] text-center">
        <p className="font-display text-lg font-semibold text-[#191c1e]">Revenue chart</p>
        <p className="mt-2 max-w-sm text-sm text-[#565e74]">
          Chart visualization will appear here once booking data is available.
        </p>
      </Panel>
    </DashboardSubPage>
  );
}
