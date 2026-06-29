import { z } from "zod";

export const analyticsQuerySchema = z.object({
  venue_id:  z.string().uuid().optional(),
  from:      z.string().optional(), // ISO date
  to:        z.string().optional(),
  granularity: z.enum(["day", "week", "month"]).default("month"),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export interface AnalyticsSummary {
  totalRevenue:    number;
  totalBookings:   number;
  avgRating:       number;
  occupancyRate:   number;
  revenueByPeriod: Array<{ period: string; revenue: number; bookings: number }>;
}
