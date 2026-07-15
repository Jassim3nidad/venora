import { z } from "zod";
import { smartVenueSearchRequestSchema } from "@/features/search/schemas/search.schema";

/** AI search request schema */
export const aiSearchSchema = smartVenueSearchRequestSchema;
export type AISearchInput = z.infer<typeof aiSearchSchema>;

/** AI cost estimate request schema */
export const aiCostEstimatorSchema = z.object({
  venue_id: z.string().uuid(),
  guest_count: z.number().int().min(1),
  event_type: z.string().min(2),
  duration_hours: z.number().positive(),
  includes_catering: z.boolean().default(false),
  includes_av: z.boolean().default(false),
});
export type AICostEstimatorInput = z.infer<typeof aiCostEstimatorSchema>;

/** AI cost estimate response schema — mirrors ai-cost-estimator edge function output */
export const aiCostEstimateSchema = z.object({
  baseVenue: z.number(),
  packages: z.number(),
  catering: z.number(),
  av: z.number(),
  total: z.number(),
  breakdown: z.array(z.string()).min(1),
});
export type AICostEstimate = z.infer<typeof aiCostEstimateSchema>;

export const aiCostEstimatorResponseSchema = z.object({
  estimate: aiCostEstimateSchema,
  venue: z.object({
    id: z.string(),
    name: z.string(),
    basePrice: z.number().nullable(),
  }),
});
export type AICostEstimatorResponse = z.infer<
  typeof aiCostEstimatorResponseSchema
>;
