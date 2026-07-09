import { z } from "zod";

export const comparePackagesRequestSchema = z.object({
  packageIds: z.array(z.string().uuid()).min(2).max(4),
});
export type ComparePackagesRequest = z.infer<typeof comparePackagesRequestSchema>;

export const comparisonRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  venueId: z.string(),
  venueName: z.string(),
  venueCity: z.string().nullable(),
  price: z.number(),
  priceUnit: z.string(),
  minGuests: z.number().nullable(),
  maxGuests: z.number().nullable(),
  inclusions: z.array(z.string()),
});
export type ComparisonRow = z.infer<typeof comparisonRowSchema>;

export const comparisonSummarySchema = z.object({
  highlights: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  bestFor: z.array(z.object({ packageId: z.string(), note: z.string() })),
});
export type ComparisonSummary = z.infer<typeof comparisonSummarySchema>;

export const comparePackagesResponseSchema = z.object({
  comparisonTable: z.array(comparisonRowSchema),
  aiSummary: comparisonSummarySchema.nullable(),
});
export type ComparePackagesResponse = z.infer<typeof comparePackagesResponseSchema>;
