import { z } from "zod";

/** AI search request schema */
export const aiSearchSchema = z.object({
  query:    z.string().min(3, "Query must be at least 3 characters"),
  filters:  z.object({
    city:      z.string().optional(),
    capacity:  z.number().optional(),
    maxPrice:  z.number().optional(),
  }).optional(),
});
export type AISearchInput = z.infer<typeof aiSearchSchema>;

/** AI cost estimate request schema */
export const aiCostEstimatorSchema = z.object({
  venue_id:         z.string().uuid(),
  guest_count:      z.number().int().min(1),
  event_type:       z.string().min(2),
  duration_hours:   z.number().positive(),
  includes_catering: z.boolean().default(false),
  includes_av:       z.boolean().default(false),
});
export type AICostEstimatorInput = z.infer<typeof aiCostEstimatorSchema>;
