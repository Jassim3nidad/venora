import {
  DataTable,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { PayoutAccountManager } from "./PayoutAccountManager";
import { WithdrawalHistory } from "./WithdrawalHistory";
import { WithdrawalRequestForm } from "./WithdrawalRequestForm";
import {
  hasOpenWithdrawal,
  openWithdrawalReason,
} from "../domain/withdrawal-status";
import type {
  Balance,
  PayoutAccountRow,
  PayoutLedgerRow,
  WithdrawalRequestRow,
} from "../types/payout.types";

/**
 * The earnings surface, shared verbatim by the venue-owner and supplier
 * dashboards. The only difference between the two is the scope passed in;
 * every balance and row is already RLS-scoped by the queries that
 * produced it.
 */

function formatPeso(value: number, currency: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export function EarningsView({
  balance,
  accounts,
  withdrawals,
  ledger,
  scope,
  scopeId,
  minimumWithdrawal,
  holdDays,
}: {
  balance: Balance;
  accounts: PayoutAccountRow[];
  withdrawals: WithdrawalRequestRow[];
  ledger: PayoutLedgerRow[];
  scope: "organization" | "supplier";
  scopeId: string;
  minimumWithdrawal: number;
  holdDays: number;
}) {
  const blocked = hasOpenWithdrawal(withdrawals);
  const blockedReason = openWithdrawalReason(withdrawals);

  const ledgerColumns: DataTableColumn<PayoutLedgerRow>[] = [
    {
      key: "scheduled_at",
      header: "Earned",
      cell: (row) => formatDate(row.scheduled_at),
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
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "paid_at",
      header: "Paid out",
      cell: (row) => formatDate(row.paid_at),
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Available"
          value={formatPeso(balance.available, balance.currency)}
          icon="account_balance_wallet"
          highlight
        />
        <KpiCard
          label="Pending"
          value={formatPeso(balance.pending, balance.currency)}
          icon="schedule"
          change={`Held ${holdDays} days after each event`}
        />
        <KpiCard
          label="In transit"
          value={formatPeso(balance.inTransit, balance.currency)}
          icon="local_shipping"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel>
          <PanelHeader
            title="Withdrawal history"
            description="Every request you've made, and where it got to."
          />
          <WithdrawalHistory rows={withdrawals} />
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHeader
              title="Withdraw earnings"
              description="Money is available once the hold period on the underlying booking has passed."
            />
            <WithdrawalRequestForm
              balance={balance}
              accounts={accounts}
              minimum={minimumWithdrawal}
              hasOpenWithdrawal={blocked}
              blockedReason={blockedReason}
            />
          </Panel>

          <Panel>
            <PanelHeader
              title="Payout accounts"
              description="Where your withdrawals are sent. New accounts are verified before their first payout."
            />
            <PayoutAccountManager
              accounts={accounts}
              scope={scope}
              scopeId={scopeId}
            />
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHeader
          title="Earnings ledger"
          description="Each completed booking that credited your balance."
        />
        <DataTable
          columns={ledgerColumns}
          rows={ledger}
          keyFn={(row) => row.id}
          emptyMessage="No earnings yet. Completed bookings will appear here."
        />
      </Panel>
    </>
  );
}
