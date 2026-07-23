"use client";

import { KpiCard, Panel, PanelHeader } from "@/src/components/dashboard/enterprise/ui";
import { BookingsTrendChart } from "@/src/features/analytics/ui/BookingsTrendChart";
import { PopularVenuesTable } from "@/src/features/analytics/ui/PopularVenuesTable";
import type { RevenueTrendPoint } from "@/src/components/dashboard/enterprise";
import type {
  OccupancyResult,
  ConversionResult,
  PopularVenueResult,
} from "@/src/features/analytics/application/queries";
import { BarChart3 } from "lucide-react";

export type CoordinatorPerformanceClientProps = {
  hasVenues: boolean;
  trend: RevenueTrendPoint[];
  occupancy: OccupancyResult;
  conversion: ConversionResult;
  popularVenues: PopularVenueResult[];
};

export function CoordinatorPerformanceClient({
  hasVenues,
  trend,
  occupancy,
  conversion,
  popularVenues,
}: CoordinatorPerformanceClientProps) {
  if (!hasVenues) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center">
        <BarChart3 className="mb-4 h-12 w-12 text-[#94a3b8]" />
        <h3 className="mb-2 text-lg font-bold text-[#0f172a]">
          No venues assigned
        </h3>
        <p className="max-w-md text-sm font-semibold text-[#64748b] leading-relaxed">
          You haven't been assigned any venues to manage yet. Once the venue
          owner assigns venues to you, your performance metrics will appear here.
        </p>
      </div>
    );
  }

  // Calculate some aggregate values for the KPI cards
  const totalBookings = trend.reduce((sum, p) => sum + Number(p.bookings), 0);
  const totalRevenue = trend.reduce((sum, p) => sum + Number(p.revenue), 0);
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const kpis = [
    {
      label: "Total Revenue (6m)",
      value: formatCurrency(totalRevenue),
      icon: "payments",
      highlight: true,
    },
    {
      label: "Total Bookings (6m)",
      value: String(totalBookings),
      icon: "event_available",
    },
    {
      label: "Conversion Rate (30d)",
      value: `${conversion.rate.toFixed(1)}%`,
      icon: "trending_up",
    },
    {
      label: "Occupancy Rate (90d)",
      value: `${occupancy.rate.toFixed(1)}%`,
      icon: "calendar_month",
    },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {kpis.map((kpi, idx) => (
          <KpiCard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Main Chart Column */}
        <div className="flex flex-col gap-4 sm:gap-6 lg:col-span-2 lg:gap-8">
          <Panel className="rounded-[24px]">
            <PanelHeader
              title="Booking Trends"
              description="Monitor booking volume across your assigned venues over the last 6 months."
            />
            <div className="mt-6">
              <BookingsTrendChart data={trend} />
            </div>
          </Panel>
        </div>

        {/* Side Column */}
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
          <Panel className="rounded-[24px]">
            <PanelHeader
              title="Top Assigned Venues"
              description="Highest performing venues in the last 30 days."
            />
            <div className="mt-4">
              <PopularVenuesTable venues={popularVenues.slice(0, 5)} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
