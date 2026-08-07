import type { Metadata } from "next";
import {
  DashboardSubPage,
  DataTable,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";
import { AdminWithdrawalActions } from "@/features/payouts/ui/AdminWithdrawalActions";
import { VerifyPayoutAccountButton } from "@/features/payouts/ui/VerifyPayoutAccountButton";
import {
  PAYOUT_METHOD_LABELS,
  WITHDRAWAL_STATUS_LABELS,
  type PayoutMethod,
  type WithdrawalStatus,
} from "@/features/payouts/types/payout.types";

export const metadata: Metadata = { title: "Withdrawals - Admin" };
export const dynamic = "force-dynamic";

type AdminWithdrawalRow = {
  id: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  requested_at: string;
  failure_reason: string | null;
  review_note: string | null;
  provider_reference: string | null;
  organizations: { name: string } | null;
  supplier_profiles: { business_name: string } | null;
  payout_accounts: {
    method: PayoutMethod;
    bank_name: string | null;
    account_number_last4: string;
    verified_at: string | null;
  } | null;
};

type PendingAccountRow = {
  id: string;
  method: PayoutMethod;
  account_name: string;
  bank_name: string | null;
  account_number_last4: string;
  created_at: string;
  organizations: { name: string } | null;
  supplier_profiles: { business_name: string } | null;
};

const OPEN: WithdrawalStatus[] = ["pending", "approved", "processing"];

function formatPeso(amount: number, currency = "PHP") {
  return `${currency} ${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default async function AdminWithdrawalsPage() {
  await requirePermissionOrRedirect("commissions.view");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const { data } = await supabase
    .from("withdrawal_requests")
    .select(
      "id, amount, currency, status, requested_at, failure_reason, review_note, provider_reference, " +
        "organizations(name), supplier_profiles(business_name), " +
        "payout_accounts(method, bank_name, account_number_last4, verified_at)",
    )
    .order("requested_at", { ascending: false })
    .limit(100);

  // Destinations waiting on a human. A recipient cannot request a
  // withdrawal until one of these is verified, so if this list is
  // non-empty the withdrawal queue below will stay empty no matter what.
  const { data: pendingAccountData } = await supabase
    .from("payout_accounts")
    .select(
      "id, method, account_name, bank_name, account_number_last4, created_at, " +
        "organizations(name), supplier_profiles(business_name)",
    )
    .is("verified_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  const pendingAccounts = (pendingAccountData ?? []) as PendingAccountRow[];

  const rows = (data ?? []) as AdminWithdrawalRow[];
  const awaitingReview = rows.filter((row) => row.status === "pending");
  const inFlight = rows.filter((row) => OPEN.includes(row.status));
  const inFlightTotal = inFlight.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  const columns: DataTableColumn<AdminWithdrawalRow>[] = [
    {
      key: "recipient",
      header: "Recipient",
      cell: (row) => (
        <div>
          <p className="font-bold text-[#0f172a]">
            {row.organizations?.name ??
              row.supplier_profiles?.business_name ??
              "Unknown"}
          </p>
          <p className="text-xs text-[#64748b]">
            {row.payout_accounts
              ? `${PAYOUT_METHOD_LABELS[row.payout_accounts.method]}${
                  row.payout_accounts.bank_name
                    ? ` — ${row.payout_accounts.bank_name}`
                    : ""
                } ••••${row.payout_accounts.account_number_last4}`
              : "No account"}
            {row.payout_accounts && !row.payout_accounts.verified_at
              ? " · UNVERIFIED"
              : ""}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => (
        <span className="font-bold text-[#0f172a]">
          {formatPeso(row.amount, row.currency)}
        </span>
      ),
    },
    {
      key: "requested_at",
      header: "Requested",
      cell: (row) => formatDate(row.requested_at),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status}
          label={WITHDRAWAL_STATUS_LABELS[row.status]}
        />
      ),
    },
    {
      key: "detail",
      header: "Detail",
      cell: (row) =>
        row.failure_reason ?? row.review_note ?? row.provider_reference ?? "-",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <AdminWithdrawalActions withdrawalId={row.id} status={row.status} />
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Withdrawals"
      description="Review and release payouts to venue owners and suppliers. Approving clears a request; sending hands it to the payment provider."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Awaiting review"
          value={String(awaitingReview.length)}
          icon="pending_actions"
          highlight
        />
        <KpiCard
          label="In flight"
          value={String(inFlight.length)}
          icon="local_shipping"
        />
        <KpiCard
          label="In-flight value"
          value={formatPeso(inFlightTotal)}
          icon="account_balance_wallet"
        />
      </div>

      {pendingAccounts.length > 0 ? (
        <Panel>
          <PanelHeader
            title={`Payout accounts awaiting verification (${pendingAccounts.length})`}
            description="Confirm the account holder out of band before verifying. Until an account is verified its owner cannot request a withdrawal at all, so nothing will appear in the queue below."
          />
          <ul className="grid gap-3">
            {pendingAccounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0f172a]">
                    {account.organizations?.name ??
                      account.supplier_profiles?.business_name ??
                      "Unknown recipient"}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#64748b]">
                    {PAYOUT_METHOD_LABELS[account.method]}
                    {account.bank_name ? ` — ${account.bank_name}` : ""} ••••
                    {account.account_number_last4} · {account.account_name} ·
                    added {formatDate(account.created_at)}
                  </p>
                </div>
                <VerifyPayoutAccountButton payoutAccountId={account.id} />
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title="Withdrawal requests"
          description="Payouts are backed by claimed ledger rows; declining or failing one returns the money to the recipient's available balance."
        />
        <DataTable
          columns={columns}
          rows={rows}
          keyFn={(row) => row.id}
          emptyMessage="No withdrawal requests yet."
        />
      </Panel>
    </DashboardSubPage>
  );
}
