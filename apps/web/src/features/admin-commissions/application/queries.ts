import { createClient } from "@/lib/supabase/server";
import type {
  CommissionRule,
  CommissionRuleHistoryEntry,
  VenueCategoryOption,
} from "../types/commission-rule.types";

type CommissionRuleRow = {
  id: string;
  scope: string;
  reference_id: string | null;
  label: string | null;
  percentage: number | null;
  flat_fee: number | null;
  min_commission_amount: number | null;
  max_commission_amount: number | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getCommissionRules(): Promise<{
  rules: CommissionRule[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("commission_rules")
    .select(
      "id, scope, reference_id, label, percentage, flat_fee, min_commission_amount, max_commission_amount, effective_from, effective_to, is_active, created_at, updated_at",
    )
    .order("scope", { ascending: true })
    .order("effective_from", { ascending: false });

  if (error) return { rules: null, error: error.message };

  const rows = (data ?? []) as CommissionRuleRow[];

  const venueIds = rows.filter((r) => r.scope === "venue" && r.reference_id).map((r) => r.reference_id as string);
  const categoryIds = rows.filter((r) => r.scope === "category" && r.reference_id).map((r) => r.reference_id as string);

  const [venueNames, categoryNames] = await Promise.all([
    venueIds.length
      ? supabase.from("venues").select("id, name").in("id", venueIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    categoryIds.length
      ? supabase.from("venue_categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const venueNameById = new Map<string, string>((venueNames.data ?? []).map((v: any) => [v.id, v.name]));
  const categoryNameById = new Map<string, string>((categoryNames.data ?? []).map((c: any) => [c.id, c.name]));

  const rules: CommissionRule[] = rows.map((row) => ({
    id: row.id,
    scope: row.scope as CommissionRule["scope"],
    referenceId: row.reference_id,
    referenceLabel:
      row.scope === "venue"
        ? (venueNameById.get(row.reference_id ?? "") ?? null)
        : row.scope === "category"
          ? (categoryNameById.get(row.reference_id ?? "") ?? null)
          : null,
    label: row.label,
    percentage: row.percentage !== null ? Number(row.percentage) : null,
    flatFee: row.flat_fee !== null ? Number(row.flat_fee) : null,
    minCommissionAmount: row.min_commission_amount !== null ? Number(row.min_commission_amount) : null,
    maxCommissionAmount: row.max_commission_amount !== null ? Number(row.max_commission_amount) : null,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { rules, error: null };
}

export async function getCommissionRuleHistory(ruleId: string): Promise<{
  history: CommissionRuleHistoryEntry[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("commission_change_history")
    .select("id, action, previous_values, new_values, reason, created_at, profiles:actor_id (full_name)")
    .eq("rule_id", ruleId)
    .order("created_at", { ascending: false });

  if (error) return { history: null, error: error.message };

  const history: CommissionRuleHistoryEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    action: row.action,
    previousValues: row.previous_values,
    newValues: row.new_values,
    reason: row.reason,
    actorName: row.profiles?.full_name ?? null,
    createdAt: row.created_at,
  }));

  return { history, error: null };
}

export async function getVenueCategoryOptions(): Promise<VenueCategoryOption[]> {
  const supabase = (await createClient()) as any;
  const { data } = await supabase.from("venue_categories").select("id, name").order("name");
  return (data ?? []) as VenueCategoryOption[];
}
