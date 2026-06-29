import { z } from "zod";

export const adminApproveVenueSchema = z.object({
  venue_id: z.string().uuid(),
  action:   z.enum(["approve", "reject", "suspend"]),
  reason:   z.string().max(500).optional(),
});
export type AdminApproveVenueInput = z.infer<typeof adminApproveVenueSchema>;

export const adminCommissionSchema = z.object({
  venue_id: z.string().uuid().optional(),
  rate:     z.number().min(0).max(1),
  tier:     z.enum(["default", "premium", "promotional"]),
});
export type AdminCommissionInput = z.infer<typeof adminCommissionSchema>;
