export type CommissionScope = "global" | "category" | "venue";

export type CommissionRule = {
  id: string;
  scope: CommissionScope;
  referenceId: string | null;
  referenceLabel: string | null;
  label: string | null;
  percentage: number | null;
  flatFee: number | null;
  minCommissionAmount: number | null;
  maxCommissionAmount: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommissionRuleHistoryEntry = {
  id: string;
  action: string;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
};

export type VenueCategoryOption = { id: string; name: string };
