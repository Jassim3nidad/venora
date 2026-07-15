import type { Metadata } from "next";
import {
  DashboardSubPage,
  DataTable,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  requirePermissionOrRedirect,
  hasPermission,
} from "@/lib/rbac/admin-context";
import {
  getMarketplaceFlags,
  getRepeatedRejectionSignals,
  getCancellationSignals,
  getPaymentFailureSignals,
  getRefundSignals,
  getPriceOutlierSignals,
} from "@/features/admin-marketplace/application/queries";
import { updateMarketplaceFlagAction } from "@/features/admin-marketplace/application/actions";
import { CreateFlagButton } from "@/features/admin-marketplace/ui/CreateFlagButton";
import {
  ReviewActionBar,
  type ReviewActionDef,
} from "@/components/admin/ReviewActionBar";
import type {
  CancellationSignal,
  MarketplaceFlag,
  PriceOutlierSignal,
  RepeatedRejectionSignal,
  TransactionSignal,
} from "@/features/admin-marketplace/types/marketplace.types";

export const metadata: Metadata = { title: "Marketplace Monitoring - Admin" };
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}
function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString()}`;
}

const FLAG_ACTIONS: ReviewActionDef[] = [
  { key: "investigating", label: "Investigate", variant: "secondary" },
  {
    key: "escalated",
    label: "Escalate",
    variant: "danger",
    requiresReason: true,
    reasonLabel: "Why escalate this case?",
  },
  { key: "resolved", label: "Resolve", variant: "primary" },
  { key: "dismissed", label: "Dismiss", variant: "secondary" },
];

export default async function AdminMarketplacePage() {
  await requirePermissionOrRedirect("marketplace.view");
  const canModerate = await hasPermission("marketplace.moderate");

  const [
    { flags, error: flagsError },
    repeatedRejections,
    cancellations,
    paymentFailures,
    refunds,
    priceOutliers,
  ] = await Promise.all([
    getMarketplaceFlags(),
    getRepeatedRejectionSignals(),
    getCancellationSignals(),
    getPaymentFailureSignals(),
    getRefundSignals(),
    getPriceOutlierSignals(),
  ]);

  async function submitFlagStatus(input: {
    id: string;
    action: string;
    reason?: string;
  }) {
    "use server";
    return updateMarketplaceFlagAction({
      id: input.id,
      status: input.action as any,
      reason: input.reason,
    });
  }

  const flagColumns: DataTableColumn<MarketplaceFlag>[] = [
    {
      key: "entity",
      header: "Entity",
      cell: (row) => `${row.entityType} · ${row.entityId.slice(0, 8)}`,
    },
    {
      key: "type",
      header: "Flag type",
      cell: (row) => row.flagType.replace(/_/g, " "),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => (
        <StatusBadge
          status={
            row.severity === "high"
              ? "declined"
              : row.severity === "low"
                ? "inactive"
                : "pending"
          }
          label={row.severity}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.status === "open" ? "pending" : row.status} />
      ),
    },
    {
      key: "assignee",
      header: "Assigned to",
      cell: (row) => row.assignedToName ?? "Unassigned",
    },
    {
      key: "created",
      header: "Opened",
      cell: (row) => formatDate(row.createdAt),
    },
    ...(canModerate
      ? [
          {
            key: "actions",
            header: "Actions",
            cell: (row: MarketplaceFlag) =>
              row.status === "resolved" || row.status === "dismissed" ? (
                <span className="text-xs text-[#6b7280]">Closed</span>
              ) : (
                <ReviewActionBar
                  entityId={row.id}
                  actions={FLAG_ACTIONS}
                  onSubmit={submitFlagStatus}
                />
              ),
          } satisfies DataTableColumn<MarketplaceFlag>,
        ]
      : []),
  ];

  const rejectionColumns: DataTableColumn<RepeatedRejectionSignal>[] = [
    {
      key: "entity",
      header: "Listing",
      cell: (row) => `${row.label} (${row.entityType})`,
    },
    {
      key: "count",
      header: "Rejections (last 180 days)",
      cell: (row) => String(row.rejectionCount),
    },
    ...(canModerate
      ? [
          {
            key: "actions",
            header: "",
            cell: (row: RepeatedRejectionSignal) => (
              <CreateFlagButton
                entityType={row.entityType}
                entityId={row.entityId}
                flagType="repeated_rejection"
                label={row.label}
              />
            ),
          } satisfies DataTableColumn<RepeatedRejectionSignal>,
        ]
      : []),
  ];

  const cancellationColumns: DataTableColumn<CancellationSignal>[] = [
    { key: "venue", header: "Venue", cell: (row) => row.venueName },
    {
      key: "count",
      header: "Cancellations (last 90 days)",
      cell: (row) => String(row.cancellationCount),
    },
    ...(canModerate
      ? [
          {
            key: "actions",
            header: "",
            cell: (row: CancellationSignal) => (
              <CreateFlagButton
                entityType="venue"
                entityId={row.venueId}
                flagType="high_cancellation_rate"
                label={row.venueName}
              />
            ),
          } satisfies DataTableColumn<CancellationSignal>,
        ]
      : []),
  ];

  const transactionColumns = (
    flagType: "payment_failures" | "refund_spike",
  ): DataTableColumn<TransactionSignal>[] => [
    { key: "venue", header: "Venue", cell: (row) => row.venueName ?? "—" },
    { key: "amount", header: "Amount", cell: (row) => formatPeso(row.amount) },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    { key: "date", header: "Date", cell: (row) => formatDate(row.createdAt) },
    ...(canModerate
      ? [
          {
            key: "actions",
            header: "",
            cell: (row: TransactionSignal) => (
              <CreateFlagButton
                entityType="booking"
                entityId={row.bookingId}
                flagType={flagType}
                label={row.venueName ?? "Booking"}
              />
            ),
          } satisfies DataTableColumn<TransactionSignal>,
        ]
      : []),
  ];

  const priceColumns: DataTableColumn<PriceOutlierSignal>[] = [
    { key: "venue", header: "Venue", cell: (row) => row.venueName },
    {
      key: "price",
      header: "Base price",
      cell: (row) => formatPeso(row.basePrice),
    },
    {
      key: "mean",
      header: "Platform mean",
      cell: (row) => formatPeso(row.meanPrice),
    },
    {
      key: "deviation",
      header: "Deviation",
      cell: (row) => `${row.deviation > 0 ? "+" : ""}${row.deviation}σ`,
    },
    ...(canModerate
      ? [
          {
            key: "actions",
            header: "",
            cell: (row: PriceOutlierSignal) => (
              <CreateFlagButton
                entityType="venue"
                entityId={row.venueId}
                flagType="suspicious_pricing"
                label={row.venueName}
              />
            ),
          } satisfies DataTableColumn<PriceOutlierSignal>,
        ]
      : []),
  ];

  return (
    <DashboardSubPage
      title="Marketplace Monitoring"
      description="Signals computed from real booking, payment, and review activity — flag anything worth tracking as a case."
    >
      <Panel>
        <PanelHeader
          title="Open cases"
          description="Manually tracked flags, from creation through resolution."
        />
        {flagsError ? (
          <EmptyState
            icon="error"
            title="Could not load cases"
            description={flagsError}
          />
        ) : flags && flags.length > 0 ? (
          <DataTable
            rows={flags}
            columns={flagColumns}
            keyFn={(row) => row.id}
          />
        ) : (
          <EmptyState
            icon="flag"
            title="No cases yet"
            description="Flag a signal below to start tracking it as a case."
          />
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Repeated rejections"
            description="Listings rejected 2+ times in the last 180 days."
          />
          {repeatedRejections.length > 0 ? (
            <DataTable
              rows={repeatedRejections}
              columns={rejectionColumns}
              keyFn={(row) => `${row.entityType}-${row.entityId}`}
            />
          ) : (
            <EmptyState
              icon="verified"
              title="No repeated rejections"
              description="No listing has been rejected more than once recently."
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="High cancellation rate"
            description="Venues with 3+ cancelled bookings in the last 90 days."
          />
          {cancellations.length > 0 ? (
            <DataTable
              rows={cancellations}
              columns={cancellationColumns}
              keyFn={(row) => row.venueId}
            />
          ) : (
            <EmptyState
              icon="event_available"
              title="No cancellation spikes"
              description="No venue has an unusual cancellation pattern."
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent payment failures"
            description="The latest failed payment transactions."
          />
          {paymentFailures.length > 0 ? (
            <DataTable
              rows={paymentFailures}
              columns={transactionColumns("payment_failures")}
              keyFn={(row) => row.id}
            />
          ) : (
            <EmptyState
              icon="credit_card_off"
              title="No recent payment failures"
              description="Failed transactions will appear here."
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent refunds"
            description="Refunded or partially-refunded transactions."
          />
          {refunds.length > 0 ? (
            <DataTable
              rows={refunds}
              columns={transactionColumns("refund_spike")}
              keyFn={(row) => row.id}
            />
          ) : (
            <EmptyState
              icon="currency_exchange"
              title="No recent refunds"
              description="Refund activity will appear here."
            />
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Pricing outliers"
          description="Published venues priced more than 2 standard deviations from the platform mean base price."
        />
        {priceOutliers.length > 0 ? (
          <DataTable
            rows={priceOutliers}
            columns={priceColumns}
            keyFn={(row) => row.venueId}
          />
        ) : (
          <EmptyState
            icon="payments"
            title="No pricing outliers"
            description="Not enough published venues yet, or no prices are unusual."
          />
        )}
      </Panel>
    </DashboardSubPage>
  );
}
