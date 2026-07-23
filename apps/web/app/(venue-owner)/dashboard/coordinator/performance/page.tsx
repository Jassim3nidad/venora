import {
  getOwnerDashboardContext,
  requireCoordinatorPermission,
  getOwnerVenueIds,
} from "@/src/lib/dashboard/org-dashboard-data";
import {
  getRevenueTrend,
  getOccupancyRate,
  getConversionRate,
  getPopularVenues,
  lastNMonthsRange,
  getOccupancyWindow,
} from "@/src/features/analytics/application/queries";
import { DashboardSubPage } from "@/src/components/dashboard/enterprise";
import { CoordinatorPerformanceClient } from "./CoordinatorPerformanceClient";
import type { AnalyticsScope } from "@/src/features/analytics/application/queries";

export default async function CoordinatorPerformancePage() {
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("view_booking_performance", context);

  const venueIds = await getOwnerVenueIds(context);
  const { supabase } = context;
  
  // If no venues assigned, show empty state in client
  if (venueIds.length === 0) {
    return (
      <DashboardSubPage title="Performance">
        <CoordinatorPerformanceClient 
          hasVenues={false}
          trend={[]} 
          occupancy={{ rate: 0, reservedDays: 0, totalDays: 0 }}
          conversion={{ rate: 0, converted: 0, total: 0 }}
          popularVenues={[]}
        />
      </DashboardSubPage>
    );
  }

  const scope: AnalyticsScope = { kind: "venues", venueIds };

  // Fetch metrics concurrently
  const [trendRes, occupancyRes, conversionRes, popularVenuesRes] = await Promise.all([
    getRevenueTrend(supabase, scope, lastNMonthsRange(6)),
    getOccupancyRate(supabase, scope, getOccupancyWindow()),
    getConversionRate(supabase, scope, lastNMonthsRange(1)),
    getPopularVenues(supabase, scope, lastNMonthsRange(1)),
  ]);

  const trend = trendRes ?? [];
  const occupancy = occupancyRes ?? { rate: 0, reservedDays: 0, totalDays: 0 };
  const conversion = conversionRes ?? { rate: 0, converted: 0, total: 0 };
  const popularVenues = popularVenuesRes ?? [];

  return (
    <DashboardSubPage title="Performance">
      <CoordinatorPerformanceClient
        hasVenues={true}
        trend={trend}
        occupancy={occupancy}
        conversion={conversion}
        popularVenues={popularVenues}
      />
    </DashboardSubPage>
  );
}