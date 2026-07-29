import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DashboardSubPage,
  DataTable,
  DashButton,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";
import {
  getAdminPaymentDetail,
  type AdminPaymentAlertRow,
  type AdminPaymentReconciliationRow,
  type AdminRefundRow,
  type AdminWebhookRow,
} from "@/features/admin-payments/application/queries";
import { runPaymentReconciliationAction } from "@/features/admin-payments/application/actions";

export const metadata: Metadata = {
  title: "Payment Detail - Admin",
};
export const dynamic = "force-dynamic";

function formatPeso(amount: number | null, currency = "PHP") {
  if (amount == null) return "-";
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

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
        {label}
      </p>
      <div className="mt-1 text-sm font-bold text-[#111827]">{value}</div>
    </div>
  );
}

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionOrRedirect("payments.view");
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const detail = await getAdminPaymentDetail(supabase, id);

  if (!detail) notFound();

  const reconciliationColumns: DataTableColumn<AdminPaymentReconciliationRow>[] =
    [
      {
        key: "status",
        header: "Result",
        cell: (row) => (
          <div className="space-y-1">
            <StatusBadge status={row.status} />
            <p className="text-xs text-[#64748b]">{row.summary}</p>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amounts",
        cell: (row) => (
          <div className="text-xs text-[#475569]">
            <p>
              Venora: {formatPeso(row.venoraAmount, row.venoraCurrency)}
            </p>
            <p>
              Provider:{" "}
              {formatPeso(row.providerAmount, row.providerCurrency ?? "PHP")}
            </p>
          </div>
        ),
      },
      {
        key: "provider",
        header: "Provider",
        cell: (row) => (
          <div className="text-xs text-[#475569]">
            <p className="font-semibold text-[#111827]">
              {row.providerStatus ?? "No provider status"}
            </p>
            <p className="max-w-[180px] truncate" title={row.providerReference ?? undefined}>
              {row.providerReference ?? "No provider reference"}
            </p>
          </div>
        ),
      },
      {
        key: "when",
        header: "Reviewed",
        cell: (row) => (
          <span className="text-xs text-[#475569]">
            {formatDate(row.reviewedAt ?? row.createdAt)}
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
            <p className="text-xs text-[#64748b]">{row.description}</p>
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
      key: "detected",
      header: "Detected",
      cell: (row) => (
        <span className="text-xs text-[#475569]">
          {formatDate(row.detectedAt)}
        </span>
      ),
    },
  ];

  const refundColumns: DataTableColumn<AdminRefundRow>[] = [
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
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <span className="text-xs text-[#475569]">{row.reason ?? "-"}</span>
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
          <p className="max-w-[220px] truncate text-xs text-[#64748b]">
            {row.eventId}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "received",
      header: "Received",
      cell: (row) => (
        <span className="text-xs text-[#475569]">
          {formatDate(row.receivedAt)}
        </span>
      ),
    },
  ];

  const transaction = detail.transaction;

  return (
    <DashboardSubPage
      title={`Payment ${shortId(transaction.id)}`}
      description="Review payment state, provider evidence, refunds, alerts, and reconciliation history."
      action={
        <DashButton href="/admin/payments" variant="secondary" icon="arrow_back">
          Back to Payments
        </DashButton>
      }
    >
      <Panel>
        <PanelHeader
          title="Transaction summary"
          description="Venora's stored transaction data. Reconciliation creates a review snapshot without changing payment state."
          action={
            <form action={runPaymentReconciliationAction}>
              <input type="hidden" name="transactionId" value={transaction.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-xl bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm shadow-blue-200"
              >
                Run reconciliation
              </button>
            </form>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem
            label="Amount"
            value={formatPeso(transaction.amount, transaction.currency)}
          />
          <DetailItem
            label="Commission"
            value={formatPeso(transaction.commissionAmount, transaction.currency)}
          />
          <DetailItem label="Status" value={<StatusBadge status={transaction.status} />} />
          <DetailItem
            label="Provider"
            value={
              <span className="capitalize">{transaction.paymentProvider}</span>
            }
          />
          <DetailItem label="Payment kind" value={transaction.paymentKind} />
          <DetailItem
            label="Provider reference"
            value={
              <span className="break-all">
                {transaction.providerReference ?? "No provider reference"}
              </span>
            }
          />
          <DetailItem label="Created" value={formatDate(transaction.createdAt)} />
          <DetailItem label="Paid" value={formatDate(transaction.paidAt)} />
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel>
            <PanelHeader
              title="Reconciliation history"
              description="Every manual reconciliation run is kept as a timestamped record."
            />
            {detail.reconciliations.length > 0 ? (
              <DataTable
                rows={detail.reconciliations}
                columns={reconciliationColumns}
                keyFn={(row) => row.id}
              />
            ) : (
              <EmptyState
                icon="fact_check"
                title="No reconciliation records yet"
                description="Run reconciliation to compare Venora's payment state with available provider evidence."
              />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Payment alerts"
              description="Alerts created from reconciliation mismatches or provider-risk signals."
            />
            {detail.alerts.length > 0 ? (
              <DataTable
                rows={detail.alerts}
                columns={alertColumns}
                keyFn={(row) => row.id}
              />
            ) : (
              <EmptyState
                icon="verified"
                title="No alerts for this payment"
                description="Open payment monitoring alerts linked to this transaction will appear here."
              />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Refunds"
              description="Refund requests linked to this transaction."
            />
            {detail.refunds.length > 0 ? (
              <DataTable
                rows={detail.refunds}
                columns={refundColumns}
                keyFn={(row) => row.id}
              />
            ) : (
              <EmptyState
                icon="replay"
                title="No refunds"
                description="Refund activity will appear here when requested."
              />
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Booking context" />
            <div className="space-y-3">
              <DetailItem label="Venue" value={transaction.venueName} />
              <DetailItem
                label="Booking"
                value={
                  <Link
                    href={`/admin/bookings?bookingId=${transaction.bookingId}`}
                    className="text-[#1d4ed8] hover:underline"
                  >
                    {shortId(transaction.bookingId)}
                  </Link>
                }
              />
              <DetailItem
                label="Booking status"
                value={
                  transaction.bookingStatus ? (
                    <StatusBadge status={transaction.bookingStatus} />
                  ) : (
                    "-"
                  )
                }
              />
              <DetailItem
                label="Event date"
                value={transaction.bookingEventDate ?? "-"}
              />
              <DetailItem
                label="Booking total"
                value={formatPeso(transaction.bookingTotalAmount, transaction.currency)}
              />
              {transaction.venueSlug ? (
                <Link
                  href={`/venues/${transaction.venueSlug}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#dbeafe] bg-white text-sm font-bold text-[#1d4ed8]"
                >
                  View public venue
                </Link>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Webhook timeline"
              description="Recent provider webhooks for this payment provider."
            />
            {detail.webhooks.length > 0 ? (
              <DataTable
                rows={detail.webhooks}
                columns={webhookColumns}
                keyFn={(row) => row.id}
              />
            ) : (
              <EmptyState
                icon="sync"
                title="No webhook rows"
                description="Webhook evidence appears here after provider callbacks are received."
              />
            )}
          </Panel>
        </div>
      </div>
    </DashboardSubPage>
  );
}
