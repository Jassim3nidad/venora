import type { Metadata } from "next";
import Link from "next/link";
import {
  DashboardSubPage,
  DataTable,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";
import {
  getAdminPaymentsWorkspace,
  type AdminPaymentAlertRow,
  type AdminRefundRow,
  type AdminTransactionRow,
  type AdminWebhookRow,
  type ProviderFilter,
  type RefundStatusFilter,
  type TransactionStatusFilter,
} from "@/features/admin-payments/application/queries";

export const metadata: Metadata = {
  title: "Payments & Refunds - Admin",
};
export const dynamic = "force-dynamic";

const TX_STATUS_OPTIONS: { value: TransactionStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially refunded" },
  { value: "cancelled", label: "Cancelled" },
];

const PROVIDER_OPTIONS: { value: ProviderFilter; label: string }[] = [
  { value: "all", label: "All providers" },
  { value: "paymongo", label: "PayMongo" },
  { value: "maya", label: "Maya" },
  { value: "stripe", label: "Stripe" },
];

const REFUND_STATUS_OPTIONS: { value: RefundStatusFilter; label: string }[] = [
  { value: "all", label: "All refund statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatPeso(amount: number, currency = "PHP") {
  return `${currency} ${Math.round(amount).toLocaleString("en-PH")}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortId(id: string) {
  return id.slice(0, 8);
}

type Props = {
  searchParams: Promise<{
    status?: string;
    provider?: string;
    refundStatus?: string;
  }>;
};

export default async function AdminPaymentsPage({ searchParams }: Props) {
  await requirePermissionOrRedirect("payments.view");

  const params = await searchParams;
  const status = (
    TX_STATUS_OPTIONS.some((o) => o.value === params.status)
      ? params.status
      : "all"
  ) as TransactionStatusFilter;
  const provider = (
    PROVIDER_OPTIONS.some((o) => o.value === params.provider)
      ? params.provider
      : "all"
  ) as ProviderFilter;
  const refundStatus = (
    REFUND_STATUS_OPTIONS.some((o) => o.value === params.refundStatus)
      ? params.refundStatus
      : "all"
  ) as RefundStatusFilter;

  const supabase = (await createClient()) as any;
  const { transactions, refunds, webhooks, alerts, kpis, errors } =
    await getAdminPaymentsWorkspace(supabase, {
      transactionStatus: status,
      provider,
      refundStatus,
    });

  function filterHref(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const merged = {
      status,
      provider,
      refundStatus,
      ...overrides,
    };
    Object.entries(merged).forEach(([key, value]) => {
      if (value && value !== "all") next.set(key, value);
    });
    const qs = next.toString();
    return qs ? `/admin/payments?${qs}` : "/admin/payments";
  }

  const transactionColumns: DataTableColumn<AdminTransactionRow>[] = [
    {
      key: "venue",
      header: "Booking / Venue",
      cell: (row) => (
        <div>
          <Link
            href={`/admin/payments/${row.id}`}
            className="font-semibold text-[#111827] hover:text-[#1d4ed8] hover:underline"
          >
            {row.venueName}
          </Link>
          <p className="text-xs text-[#6b7280]">
            Booking {shortId(row.bookingId)} · {row.paymentKind}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">
          {formatPeso(row.amount, row.currency)}
        </span>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (row) => (
        <div>
          <p className="font-semibold capitalize text-[#111827]">
            {row.paymentProvider}
          </p>
          <p
            className="max-w-[160px] truncate text-xs text-[#6b7280]"
            title={row.providerReference ?? undefined}
          >
            {row.providerReference ?? "No provider ref"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} />
          {row.failureReason ? (
            <p
              className="max-w-[180px] text-xs text-red-600"
              title={row.failureReason}
            >
              {row.failureReason}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "when",
      header: "Timeline",
      cell: (row) => (
        <div className="text-xs text-[#475569]">
          <p>Created {formatDate(row.createdAt)}</p>
          <p>Paid {formatDate(row.paidAt)}</p>
        </div>
      ),
    },
  ];

  const refundColumns: DataTableColumn<AdminRefundRow>[] = [
    {
      key: "venue",
      header: "Booking / Venue",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.venueName}</p>
          <p className="text-xs text-[#6b7280]">
            Booking {shortId(row.bookingId)} · Tx {shortId(row.transactionId)}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">
          {formatPeso(row.amount, row.currency)}
        </span>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (row) => (
        <span className="font-semibold capitalize text-[#111827]">
          {row.paymentProvider}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} />
          {row.reason ? (
            <p
              className="max-w-[180px] text-xs text-[#64748b]"
              title={row.reason}
            >
              {row.reason}
            </p>
          ) : null}
          {row.failureReason ? (
            <p
              className="max-w-[180px] text-xs text-red-600"
              title={row.failureReason}
            >
              {row.failureReason}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "when",
      header: "Timeline",
      cell: (row) => (
        <div className="text-xs text-[#475569]">
          <p>Requested {formatDate(row.createdAt)}</p>
          <p>Processed {formatDate(row.processedAt)}</p>
        </div>
      ),
    },
  ];

  const webhookColumns: DataTableColumn<AdminWebhookRow>[] = [
    {
      key: "event",
      header: "Event",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.eventType}</p>
          <p
            className="max-w-[220px] truncate text-xs text-[#6b7280]"
            title={row.eventId}
          >
            {row.eventId}
          </p>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (row) => (
        <span className="font-semibold capitalize text-[#111827]">
          {row.provider}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} />
          {row.error ? (
            <p className="max-w-[220px] text-xs text-red-600" title={row.error}>
              {row.error}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "when",
      header: "Received",
      cell: (row) => (
        <span className="text-xs text-[#475569]">
          {formatDate(row.receivedAt)}
        </span>
      ),
    },
  ];

  const alertColumns: DataTableColumn<AdminPaymentAlertRow>[] = [
    {
      key: "alert",
      header: "Alert",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.title}</p>
          {row.description ? (
            <p className="max-w-xl text-xs text-[#64748b]">
              {row.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => <StatusBadge status={row.severity} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "transaction",
      header: "Transaction",
      cell: (row) =>
        row.transactionId ? (
          <Link
            href={`/admin/payments/${row.transactionId}`}
            className="text-sm font-bold text-[#1d4ed8] hover:underline"
          >
            {shortId(row.transactionId)}
          </Link>
        ) : (
          <span className="text-sm text-[#64748b]">-</span>
        ),
    },
    {
      key: "detected",
      header: "Detected",
      cell: (row) => (
        <span className="text-xs text-[#475569]">
          {formatDate(row.detectedAt)}
        </span>
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Payments & Refunds"
      description="Monitor booking deposits, refunds, and payment webhook reconciliation. PayMongo is the active gateway."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          label="Paid volume"
          value={formatPeso(kpis.paidVolume)}
          icon="payments"
          highlight
        />
        <KpiCard
          label="Pending payments"
          value={String(kpis.pendingCount)}
          icon="hourglass_empty"
        />
        <KpiCard
          label="Failed payments"
          value={String(kpis.failedCount)}
          icon="error"
        />
        <KpiCard
          label="Open refunds"
          value={String(kpis.refundPendingCount)}
          icon="replay"
        />
        <KpiCard
          label="Failed webhooks"
          value={String(kpis.webhookFailedCount)}
          icon="sync_problem"
        />
        <KpiCard
          label="Open alerts"
          value={String(kpis.openAlertCount)}
          change={
            kpis.criticalAlertCount > 0
              ? `${kpis.criticalAlertCount} critical`
              : undefined
          }
          icon="notification_important"
        />
      </div>

      <Panel>
        <PanelHeader
          title="Gateway status"
          description="Operational flags for payment providers. This workspace is read-only monitoring."
        />
        <div className="grid gap-3">
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
              PayMongo
            </p>
            <p className="mt-1 text-sm font-black text-[#0f172a]">Active</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-[#64748b]">
          Related:{" "}
          <Link
            href="/admin/commissions"
            className="text-[#1d4ed8] hover:underline"
          >
            Commissions
          </Link>
          {" · "}
          <Link
            href="/admin/marketplace"
            className="text-[#1d4ed8] hover:underline"
          >
            Marketplace signals
          </Link>
          {" · "}
          <Link
            href="/admin/disputes"
            className="text-[#1d4ed8] hover:underline"
          >
            Disputes
          </Link>
        </p>
      </Panel>

      <Panel>
        <PanelHeader
          title="Payment monitoring alerts"
          description="Open reconciliation and provider-risk alerts that need finance or operations follow-up."
        />
        {errors.alerts ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errors.alerts}
          </p>
        ) : null}
        {alerts.length > 0 ? (
          <DataTable
            rows={alerts}
            columns={alertColumns}
            keyFn={(row) => row.id}
            emptyMessage="No payment alerts."
          />
        ) : (
          <EmptyState
            icon="verified"
            title="No payment alerts"
            description="Amount, currency, provider, and webhook issues will appear here after reconciliation checks."
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Transactions"
          description="Booking deposits and settlements recorded in transactions."
        />
        <form className="mb-4 flex flex-wrap gap-3" method="get">
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-[#64748b]">
            Status
            <select
              name="status"
              defaultValue={status}
              className="h-10 min-w-[160px] rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold text-[#0f172a]"
            >
              {TX_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-[#64748b]">
            Provider
            <select
              name="provider"
              defaultValue={provider}
              className="h-10 min-w-[160px] rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold text-[#0f172a]"
            >
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {refundStatus !== "all" ? (
            <input type="hidden" name="refundStatus" value={refundStatus} />
          ) : null}
          <button
            type="submit"
            className="mt-5 h-10 rounded-xl bg-[#1d4ed8] px-4 text-sm font-bold text-white"
          >
            Apply
          </button>
          <Link
            href={filterHref({ status: "all", provider: "all" })}
            className="mt-5 inline-flex h-10 items-center rounded-xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a]"
          >
            Reset
          </Link>
        </form>
        {errors.transactions ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errors.transactions}
          </p>
        ) : null}
        {transactions.length > 0 ? (
          <DataTable
            rows={transactions}
            columns={transactionColumns}
            keyFn={(row) => row.id}
            emptyMessage="No transactions match these filters."
          />
        ) : (
          <EmptyState
            icon="payments"
            title="No transactions found"
            description="Paid and pending booking payments will appear here."
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Refunds"
          description="Refund rows linked to booking transactions."
        />
        <form className="mb-4 flex flex-wrap gap-3" method="get">
          {status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          {provider !== "all" ? (
            <input type="hidden" name="provider" value={provider} />
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-[#64748b]">
            Refund status
            <select
              name="refundStatus"
              defaultValue={refundStatus}
              className="h-10 min-w-[180px] rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold text-[#0f172a]"
            >
              {REFUND_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-5 h-10 rounded-xl bg-[#1d4ed8] px-4 text-sm font-bold text-white"
          >
            Apply
          </button>
        </form>
        {errors.refunds ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errors.refunds}
          </p>
        ) : null}
        {refunds.length > 0 ? (
          <DataTable
            rows={refunds}
            columns={refundColumns}
            keyFn={(row) => row.id}
            emptyMessage="No refunds match these filters."
          />
        ) : (
          <EmptyState
            icon="replay"
            title="No refunds found"
            description="Customer and ops refunds will appear here when requested."
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Webhook attention"
          description="Failed or still-processing payment webhook events that may need reconciliation."
        />
        {errors.webhooks ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errors.webhooks}
          </p>
        ) : null}
        {webhooks.length > 0 ? (
          <DataTable
            rows={webhooks}
            columns={webhookColumns}
            keyFn={(row) => row.id}
            emptyMessage="No webhook issues."
          />
        ) : (
          <EmptyState
            icon="sync"
            title="No webhook issues"
            description="Failed or stuck webhook events will appear here for ops follow-up."
          />
        )}
      </Panel>
    </DashboardSubPage>
  );
}
