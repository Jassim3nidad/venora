"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DataTable,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { cancelWithdrawalAction } from "../application/payout-actions";
import {
  WITHDRAWAL_STATUS_LABELS,
  type WithdrawalRequestRow,
} from "../types/payout.types";

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

export function WithdrawalHistory({ rows }: { rows: WithdrawalRequestRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cancel(withdrawalId: string) {
    setError(null);
    startTransition(async () => {
      const result = await cancelWithdrawalAction({ withdrawalId });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  const columns: DataTableColumn<WithdrawalRequestRow>[] = [
    {
      key: "requested_at",
      header: "Requested",
      cell: (row) => formatDate(row.requested_at),
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
        row.failure_reason ?? row.review_note ?? formatDate(row.processed_at),
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        // Only a request still awaiting review is ours to cancel; once it
        // is with the provider the money may already be moving.
        row.status === "pending" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => cancel(row.id)}
            className="text-xs font-bold uppercase tracking-wider text-red-600 transition hover:underline disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null,
    },
  ];

  return (
    <div className="grid gap-3">
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        keyFn={(row) => row.id}
        emptyMessage="No withdrawals yet. Your first request will appear here."
      />
    </div>
  );
}
