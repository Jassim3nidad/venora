import { describe, expect, it } from "vitest";
import {
  buildAnalyticsCsv,
  buildAnalyticsPdf,
  type AnalyticsExportData,
} from "./export";

const exportData: AnalyticsExportData = {
  generatedAt: "2026-07-10T10:00:00.000Z",
  range: { from: "2026-01-01", to: "2026-12-31" },
  summary: {
    totalRevenue: 120000,
    totalBookings: 3,
    confirmedBookings: 2,
    customers: 2,
    conversionRate: 66.7,
  },
  monthlyReports: [
    {
      period: "Jan 2026",
      revenue: 120000,
      bookings: 3,
      confirmedBookings: 2,
      customers: 2,
      conversionRate: 66.7,
      averageBookingValue: 60000,
      topVenue: "=SUM(A1:A2)",
    },
  ],
  popularVenues: [
    {
      id: "venue-1",
      label: "+Injected Venue",
      city: "@Injected City",
      bookings: 2,
      revenue: 120000,
      rating: 4.8,
      reviews: 8,
      value: 2,
      meta: "2 bookings",
    },
  ],
};

describe("analytics export", () => {
  it("escapes CSV cells that could be interpreted as spreadsheet formulas", () => {
    const csv = buildAnalyticsCsv(exportData);

    expect(csv).toContain("'+Injected Venue");
    expect(csv).toContain("'@Injected City");
    expect(csv).toContain(",'=SUM(A1:A2)");
  });

  it("generates a PDF byte stream with a valid PDF header", () => {
    const pdf = buildAnalyticsPdf(exportData);
    const header = new TextDecoder().decode(pdf.slice(0, 8));

    expect(header).toBe("%PDF-1.4");
  });
});
