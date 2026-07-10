import { z } from "zod";

function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const isoDateSchema = z
  .string()
  .refine(isValidDateOnly, "Use a valid YYYY-MM-DD date.");

export const analyticsQuerySchema = z.object({
  venue_id: z.string().uuid().optional(),
  from: z.string().optional(), // ISO date
  to: z.string().optional(),
  granularity: z.enum(["day", "week", "month"]).default("month"),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export const analyticsExportQuerySchema = z
  .object({
    format: z.enum(["csv", "pdf"]).default("csv"),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "The export start date must be before the end date.",
    path: ["from"],
  });
export type AnalyticsExportQuery = z.infer<typeof analyticsExportQuerySchema>;

export interface AnalyticsSummary {
  totalRevenue: number;
  totalBookings: number;
  avgRating: number;
  occupancyRate: number;
  revenueByPeriod: Array<{ period: string; revenue: number; bookings: number }>;
}
