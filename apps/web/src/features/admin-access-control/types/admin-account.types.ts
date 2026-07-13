import type { AdminTier } from "@/lib/rbac/permissions";

export type AdminAccount = {
  userId: string;
  fullName: string;
  email: string | null;
  tier: AdminTier | null;
  isActive: boolean;
  assignedAt: string | null;
  grantedAt: string;
};
