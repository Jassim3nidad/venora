import type { Metadata } from "next";
import {
  DashboardSubPage,
  KpiCard,
  Panel,
  PanelHeader,
} from "@/components/dashboard/enterprise";

export const metadata: Metadata = { title: "Analytics - Dashboard" };

const STAT_CARDS = [
  { label: "Total Revenue", value: "₱0", icon: "payments" },
  { label: "Total Bookings", value: "0", icon: "event_available" },
  { label: "Avg. Rating", value: "-", icon: "star" },
  { label: "Occupancy Rate", value: "0%", icon: "analytics" },
];

export default function AnalyticsPage() {
  return (
    <DashboardSubPage
      title="Analytics"
      description="Track revenue, inquiry conversion, occupancy rate, and booking trends."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <KpiCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
        ))}
      </div>

      <Panel>
        <PanelHeader
          title="Revenue Overview"
          description="Monthly revenue and booking performance."
        />
        <div
          id="analytics-stats"
          className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] bg-[#f9fafb] text-sm text-[#6b7280]"
        >
          Revenue chart - integrate Recharts or Chart.js
        </div>
      </Panel>
    </DashboardSubPage>
  );
}
