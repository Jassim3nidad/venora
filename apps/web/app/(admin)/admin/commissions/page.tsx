import type { Metadata } from "next";
import {
  DashboardSubPage,
  DataTable,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  RevenueTrendChart,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import {
  getCommissionTrend,
  lastNMonthsRange,
} from "@/features/analytics/application/queries";
import {
  requirePermissionOrRedirect,
  hasPermission,
} from "@/lib/rbac/admin-context";
import {
  getCommissionRules,
  getVenueCategoryOptions,
} from "@/features/admin-commissions/application/queries";
import {
  CreateCommissionRuleForm,
  EditCommissionRuleDialog,
} from "@/features/admin-commissions/ui/CommissionRuleForm";
import type { CommissionRule } from "@/features/admin-commissions/types/commission-rule.types";

export const metadata: Metadata = { title: "Commissions - Admin" };
export const dynamic = "force-dynamic";

function formatPeso(amount: number) {
  return `PHP ${Math.round(amount).toLocaleString()}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

type PayoutRow = {
  id: string;
  amount: number;
  status: string;
  scheduled_at: string | null;
  paid_at: string | null;
  organizations: { name: string } | { name: string }[] | null;
  supplier_profiles:
    { business_name: string } | { business_name: string }[] | null;
};

type PayoutDisplayRow = {
  id: string;
  recipient: string;
  amount: string;
  status: string;
  scheduledAt: string;
  paidAt: string;
};

export default async function AdminCommissionsPage() {
  await requirePermissionOrRedirect("commissions.view");
  const canManage = await hasPermission("commissions.manage");
  const canOverride = await hasPermission("commissions.override");

  const supabase = (await createClient()) as any;

  const range = lastNMonthsRange(12);

  const [
    { data: paidTransactions },
    { data: pendingPayouts },
    { data: paidPayoutsThisMonth },
    { count: activeRulesCount },
    commissionTrend,
    { data: recentPayoutsRaw },
    { rules, error: rulesError },
    categories,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("commission_amount")
      .eq("status", "paid"),
    supabase
      .from("payouts")
      .select("amount")
      .in("status", ["scheduled", "processing"]),
    supabase
      .from("payouts")
      .select("amount")
      .eq("status", "paid")
      .gte(
        "paid_at",
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        ).toISOString(),
      ),
    supabase
      .from("commission_rules")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .or(
        `effective_to.is.null,effective_to.gte.${new Date().toISOString().slice(0, 10)}`,
      ),
    getCommissionTrend(supabase, range),
    supabase
      .from("payouts")
      .select(
        "id, amount, status, scheduled_at, paid_at, organizations(name), supplier_profiles(business_name)",
      )
      .order("scheduled_at", { ascending: false })
      .limit(10),
    getCommissionRules(),
    getVenueCategoryOptions(),
  ]);

  const totalCommission = (paidTransactions ?? []).reduce(
    (sum: number, row: { commission_amount: number | null }) =>
      sum + (Number(row.commission_amount) || 0),
    0,
  );
  const pendingPayoutTotal = (pendingPayouts ?? []).reduce(
    (sum: number, row: { amount: number | null }) =>
      sum + (Number(row.amount) || 0),
    0,
  );
  const paidThisMonthTotal = (paidPayoutsThisMonth ?? []).reduce(
    (sum: number, row: { amount: number | null }) =>
      sum + (Number(row.amount) || 0),
    0,
  );

  const recentPayouts: PayoutDisplayRow[] = (
    (recentPayoutsRaw ?? []) as PayoutRow[]
  ).map((row) => {
    const org = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    const supplier = Array.isArray(row.supplier_profiles)
      ? row.supplier_profiles[0]
      : row.supplier_profiles;
    return {
      id: row.id,
      recipient: org?.name ?? supplier?.business_name ?? "Unknown recipient",
      amount: formatPeso(Number(row.amount) || 0),
      status: row.status,
      scheduledAt: formatDate(row.scheduled_at),
      paidAt: formatDate(row.paid_at),
    };
  });

  const columns: DataTableColumn<PayoutDisplayRow>[] = [
    {
      key: "recipient",
      header: "Recipient",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.recipient}</span>
      ),
    },
    { key: "amount", header: "Amount", cell: (row) => row.amount },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    { key: "scheduled", header: "Scheduled", cell: (row) => row.scheduledAt },
    { key: "paid", header: "Paid", cell: (row) => row.paidAt },
  ];

  const ruleColumns: DataTableColumn<CommissionRule>[] = [
    {
      key: "scope",
      header: "Scope",
      cell: (row) => (
        <div>
          <StatusBadge status="active" label={row.scope} />
          {row.referenceLabel ? (
            <p className="mt-1 text-xs text-[#6b7280]">{row.referenceLabel}</p>
          ) : null}
        </div>
      ),
    },
    { key: "label", header: "Label", cell: (row) => row.label ?? "—" },
    {
      key: "rate",
      header: "Rate",
      cell: (row) => (
        <span>
          {row.percentage !== null ? `${row.percentage}%` : ""}
          {row.percentage !== null && row.flatFee !== null ? " + " : ""}
          {row.flatFee !== null ? `₱${row.flatFee.toLocaleString()}` : ""}
        </span>
      ),
    },
    {
      key: "bounds",
      header: "Min / Max",
      cell: (row) =>
        row.minCommissionAmount !== null || row.maxCommissionAmount !== null
          ? `₱${row.minCommissionAmount?.toLocaleString() ?? "0"} – ₱${row.maxCommissionAmount?.toLocaleString() ?? "∞"}`
          : "—",
    },
    {
      key: "window",
      header: "Effective",
      cell: (row) =>
        `${formatDate(row.effectiveFrom)} – ${row.effectiveTo ? formatDate(row.effectiveTo) : "ongoing"}`,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.isActive ? "active" : "inactive"} />
      ),
    },
    ...(canOverride
      ? [
          {
            key: "actions",
            header: "Actions",
            cell: (row: CommissionRule) => (
              <EditCommissionRuleDialog rule={row} />
            ),
          } satisfies DataTableColumn<CommissionRule>,
        ]
      : []),
  ];

  return (
    <DashboardSubPage
      title="Commission Management"
      description="Platform earnings and payout summaries, distinct from gross booking revenue."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Commission Earned"
          value={formatPeso(totalCommission)}
          icon="payments"
          highlight
        />
        <KpiCard
          label="Pending Payouts"
          value={formatPeso(pendingPayoutTotal)}
          icon="pending_actions"
        />
        <KpiCard
          label="Paid Payouts This Month"
          value={formatPeso(paidThisMonthTotal)}
          icon="task_alt"
        />
        <KpiCard
          label="Active Commission Rules"
          value={String(activeRulesCount ?? 0)}
          icon="rule"
        />
      </div>

      <Panel>
        <PanelHeader
          title="Commission Trend"
          description="Platform commission earned per month, distinct from gross booking revenue."
        />
        <RevenueTrendChart data={commissionTrend} format="currency" />
      </Panel>

      <Panel>
        <PanelHeader
          title="Commission Rules"
          description="Resolution order is fixed: venue-specific rules win, then category, then the global default."
          {...(canManage
            ? { action: <CreateCommissionRuleForm categories={categories} /> }
            : {})}
        />
        {rulesError ? (
          <EmptyState
            icon="error"
            title="Could not load commission rules"
            description={rulesError}
          />
        ) : rules && rules.length > 0 ? (
          <DataTable
            rows={rules}
            columns={ruleColumns}
            keyFn={(row) => row.id}
          />
        ) : (
          <EmptyState
            icon="rule"
            title="No commission rules configured"
            description="Commission defaults to 0 until at least a global rule is created."
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Recent Payouts"
          description="The latest scheduled and completed payouts."
        />
        {recentPayouts.length > 0 ? (
          <DataTable
            rows={recentPayouts}
            columns={columns}
            keyFn={(row) => row.id}
          />
        ) : (
          <EmptyState
            icon="payments"
            title="No payouts yet"
            description="Payouts will appear here once bookings complete and commission records are generated."
          />
        )}
      </Panel>
    </DashboardSubPage>
  );
}
