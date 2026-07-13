import { z } from "zod";
import { ADMIN_TIERS } from "@/lib/rbac/permissions";

export const assignAdminTierSchema = z.object({
  userId: z.string().uuid(),
  tier: z.enum(ADMIN_TIERS as unknown as [string, ...string[]]),
  reason: z.string().trim().max(500).optional(),
});

export type AssignAdminTierInput = z.infer<typeof assignAdminTierSchema>;
