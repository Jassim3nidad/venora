import type { AnalyticsScope, DateRange } from "./queries";
import {
  getRevenueTrend,
  getOccupancyRate,
  getConversionRate,
  getTopPackages,
  getBookingDemographics,
  getCustomerGrowth,
  getPopularVenues,
  getBookingDemandHeatmap,
  getMonthlyReports,
} from "./queries";
import { getOwnerVenueIds } from "../../../../app/(venue-owner)/dashboard/_lib/owner-dashboard-data";

export type AnalyticsPeriod =
  | "last_30_days"
  | "last_90_days"
  | "last_6_months"
  | "last_12_months"
  | "this_year"
  | "previous_year";

export type AnalyticsCompare = "previous_period" | "previous_year" | "none";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function resolveDateRange(period: AnalyticsPeriod): DateRange {
  const to = new Date();
  const from = new Date(to);

  switch (period) {
    case "last_30_days":
      from.setDate(to.getDate() - 30);
      break;
    case "last_90_days":
      from.setDate(to.getDate() - 90);
      break;
    case "last_6_months":
      from.setMonth(to.getMonth() - 6);
      from.setDate(1);
      break;
    case "this_year":
      from.setFullYear(to.getFullYear(), 0, 1);
      break;
    case "previous_year":
      from.setFullYear(to.getFullYear() - 1, 0, 1);
      to.setFullYear(to.getFullYear() - 1, 11, 31);
      break;
    case "last_12_months":
    default:
      from.setFullYear(to.getFullYear() - 1);
      from.setDate(1);
      break;
  }
  return { from: toISODate(from), to: toISODate(to) };
}

function resolveCompareRange(
  range: DateRange,
  compare: AnalyticsCompare,
): DateRange | null {
  if (compare === "none") return null;

  const from = new Date(range.from);
  const to = new Date(range.to);

  if (compare === "previous_year") {
    from.setFullYear(from.getFullYear() - 1);
    to.setFullYear(to.getFullYear() - 1);
    return { from: toISODate(from), to: toISODate(to) };
  }

  // previous_period (subtract the exact same number of days)
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);
  from.setDate(from.getDate() - days);
  to.setDate(to.getDate() - days);
  return { from: toISODate(from), to: toISODate(to) };
}

export type GetVenueOwnerAnalyticsParams = {
  supabase: any;
  context: any;
  venueParam?: string;
  periodParam?: string;
  compareParam?: string;
};

export async function getVenueOwnerAnalytics({
  supabase,
  context,
  venueParam = "all",
  periodParam = "last_12_months",
  compareParam = "previous_period",
}: GetVenueOwnerAnalyticsParams) {
  const allVenueIds = await getOwnerVenueIds(context);

  let selectedVenueIds = allVenueIds;
  if (venueParam !== "all" && allVenueIds.includes(venueParam)) {
    selectedVenueIds = [venueParam];
  }

  const scope: AnalyticsScope = { kind: "venues", venueIds: selectedVenueIds };
  const range = resolveDateRange(periodParam as AnalyticsPeriod);
  const compareRange = resolveCompareRange(
    range,
    compareParam as AnalyticsCompare,
  );

  // 1. Fetch current period data
  const [
    revenueTrend,
    occupancy,
    conversion,
    topPackages,
    demographics,
    customerGrowth,
    popularVenues,
    bookingHeatmap,
    monthlyReports,
  ] = await Promise.all([
    getRevenueTrend(supabase, scope, range),
    getOccupancyRate(supabase, scope, range),
    getConversionRate(supabase, scope, range),
    getTopPackages(supabase, scope, range),
    getBookingDemographics(supabase, scope, range),
    getCustomerGrowth(supabase, scope, range),
    getPopularVenues(supabase, scope, range),
    getBookingDemandHeatmap(supabase, scope, range),
    getMonthlyReports(supabase, scope, range),
  ]);

  // 2. Fetch comparison period data for top-level KPIs
  let compareKPIs = null;
  if (compareRange) {
    const [compConversion, compOccupancy, compMonthlyReports] =
      await Promise.all([
        getConversionRate(supabase, scope, compareRange),
        getOccupancyRate(supabase, scope, compareRange),
        getMonthlyReports(supabase, scope, compareRange),
      ]);

    // Calculate aggregate totals for comparison range
    const compTotalRevenue = compMonthlyReports.reduce(
      (sum, r) => sum + r.revenue,
      0,
    );
    const compTotalBookings = compMonthlyReports.reduce(
      (sum, r) => sum + r.bookings,
      0,
    );
    const compTotalCustomers = compMonthlyReports.reduce(
      (sum, r) => sum + r.customers,
      0,
    );

    compareKPIs = {
      revenue: compTotalRevenue,
      bookings: compTotalBookings,
      customers: compTotalCustomers,
      conversion: compConversion?.rate ?? 0,
      occupancy: compOccupancy?.rate ?? 0,
    };
  }

  // Calculate current top-level KPIs
  const totalRevenue = monthlyReports.reduce((sum, r) => sum + r.revenue, 0);
  const totalBookings = monthlyReports.reduce((sum, r) => sum + r.bookings, 0);
  const totalAcceptedBookings = monthlyReports.reduce(
    (sum, r) => sum + r.confirmedBookings,
    0,
  );

  // To avoid double-counting unique customers across months, we re-query for the unique count in this range
  const { data: customerData } = await supabase
    .from("bookings")
    .select("customer_id")
    .in("venue_id", selectedVenueIds)
    .in("status", ["approved", "confirmed", "completed"])
    .gte("event_date", range.from)
    .lte("event_date", range.to);

  const totalCustomers = new Set(
    (customerData || []).map((r: any) => r.customer_id),
  ).size;

  // Additional Listing Health & Attention Needed Metrics
  const { count: pendingCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("venue_id", selectedVenueIds)
    .eq("status", "pending");

  const { data: venuesData } = await supabase
    .from("venues")
    .select("id, status, avg_rating, review_count, name")
    .in("id", selectedVenueIds);

  const venueRows = venuesData || [];
  const publishedVenues = venueRows.filter(
    (v: any) => v.status === "published",
  ).length;
  const ratedVenues = venueRows.filter(
    (v: any) => v.review_count > 0 && v.avg_rating > 0,
  );
  const avgRating =
    ratedVenues.length > 0
      ? ratedVenues.reduce(
          (sum: number, v: any) => sum + Number(v.avg_rating),
          0,
        ) / ratedVenues.length
      : null;

  return {
    scope,
    range,
    compareRange,
    venues: allVenueIds,
    venueRows, // Full array for dropdown and health
    kpis: {
      totalRevenue,
      totalBookings,
      totalAcceptedBookings,
      totalCustomers,
      conversion: conversion?.rate ?? 0,
      occupancy: occupancy?.rate ?? 0,
      avgRating,
      pendingRequests: pendingCount ?? 0,
      publishedVenues,
      compareKPIs,
    },
    revenueTrend,
    conversion,
    occupancy,
    topPackages,
    demographics,
    customerGrowth,
    popularVenues,
    bookingHeatmap,
    monthlyReports,
  };
}
