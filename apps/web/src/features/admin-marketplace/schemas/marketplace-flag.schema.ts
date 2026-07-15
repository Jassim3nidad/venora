import { z } from "zod";

export const createMarketplaceFlagSchema = z.object({
  entityType: z.enum(["venue", "supplier", "review", "booking"]),
  entityId: z.string().uuid(),
  flagType: z.enum([
    "manual",
    "suspicious_pricing",
    "repeated_rejection",
    "duplicate_listing",
    "high_cancellation_rate",
    "payment_failures",
    "refund_spike",
    "complaint_spike",
  ]),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().trim().max(1000).optional(),
});

export type CreateMarketplaceFlagInput = z.infer<
  typeof createMarketplaceFlagSchema
>;

export const updateMarketplaceFlagSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum(["open", "investigating", "escalated", "resolved", "dismissed"])
    .optional(),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
  reason: z.string().trim().max(500).optional(),
});

export type UpdateMarketplaceFlagInput = z.infer<
  typeof updateMarketplaceFlagSchema
>;
