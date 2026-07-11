import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import { requirePermission, hasPermission } from "@/lib/rbac/admin-context";
import {
  getSupplierForAdminReview,
  getSupplierReviewHistory,
} from "@/features/suppliers/application/admin-queries";
import { reviewSupplierAction } from "@/features/suppliers/application/admin-actions";
import type { SupplierReviewAction } from "@/features/suppliers/types/supplier-review-action.types";
import { ReviewActionBar, type ReviewActionDef } from "@/components/admin/ReviewActionBar";

export const metadata: Metadata = { title: "Supplier Review - Admin" };
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function actionsForStatus(status: string, canApprove: boolean, canReject: boolean, canReview: boolean, canSuspend: boolean): ReviewActionDef[] {
  const actions: ReviewActionDef[] = [];

  if (status === "pending") {
    if (canApprove) actions.push({ key: "approve", label: "Accredit", variant: "primary" });
    if (canReject) actions.push({ key: "reject", label: "Reject", variant: "danger", requiresReason: true, reasonLabel: "Why is this supplier being rejected?" });
    if (canReview) actions.push({ key: "request_info", label: "Request more info", variant: "secondary", requiresReason: true, reasonLabel: "What additional information is needed?" });
  }
  if (status === "accredited" && canSuspend) {
    actions.push({ key: "suspend", label: "Suspend", variant: "danger", requiresReason: true, reasonLabel: "Why is this supplier being suspended?" });
  }
  if ((status === "suspended" || status === "rejected") && canSuspend) {
    actions.push({ key: "restore", label: status === "suspended" ? "Restore" : "Reopen for review", variant: "primary" });
  }
  if (canReview) {
    actions.push({ key: "note", label: "Add note", variant: "secondary", requiresReason: true, reasonLabel: "Internal note" });
  }

  return actions;
}

type Props = { params: Promise<{ id: string }> };

export default async function AdminSupplierDetailPage({ params }: Props) {
  await requirePermission("suppliers.view");
  const { id } = await params;

  const [{ supplier, error }, { history }, canApprove, canReject, canReview, canSuspend] = await Promise.all([
    getSupplierForAdminReview(id),
    getSupplierReviewHistory(id),
    hasPermission("suppliers.approve"),
    hasPermission("suppliers.reject"),
    hasPermission("suppliers.review"),
    hasPermission("suppliers.suspend"),
  ]);

  if (error === "Supplier not found") notFound();

  if (error || !supplier) {
    return (
      <DashboardSubPage title="Supplier Review">
        <EmptyState icon="error" title="Could not load this supplier" description={error ?? "Unknown error"} />
      </DashboardSubPage>
    );
  }

  const actions = actionsForStatus(supplier.status, canApprove, canReject, canReview, canSuspend);

  async function submitReview(input: { id: string; action: string; reason?: string }) {
    "use server";
    return reviewSupplierAction({ id: input.id, action: input.action as SupplierReviewAction, reason: input.reason });
  }

  return (
    <DashboardSubPage
      title={supplier.businessName}
      description={supplier.categoryName ?? "No category set"}
      action={<StatusBadge status={supplier.status} />}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader title="Business details" />
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="font-bold text-[#64748b]">Owner</dt><dd className="text-[#111827]">{supplier.ownerName ?? "—"}</dd></div>
              <div><dt className="font-bold text-[#64748b]">Category</dt><dd className="text-[#111827]">{supplier.categoryName ?? <span className="text-red-600">Missing — required before accreditation</span>}</dd></div>
              <div><dt className="font-bold text-[#64748b]">Contact email</dt><dd className="text-[#111827]">{supplier.contactEmail || "—"}</dd></div>
              <div><dt className="font-bold text-[#64748b]">Contact phone</dt><dd className="text-[#111827]">{supplier.contactPhone || "—"}</dd></div>
              <div className="col-span-2"><dt className="font-bold text-[#64748b]">Service areas</dt><dd className="text-[#111827]">{supplier.serviceAreas.length > 0 ? supplier.serviceAreas.join(", ") : <span className="text-red-600">None set — required before accreditation</span>}</dd></div>
              {supplier.coverageRadiusKm ? (
                <div><dt className="font-bold text-[#64748b]">Coverage radius</dt><dd className="text-[#111827]">{supplier.coverageRadiusKm} km</dd></div>
              ) : null}
              {supplier.basePrice !== null ? (
                <div><dt className="font-bold text-[#64748b]">Base price</dt><dd className="text-[#111827]">₱{supplier.basePrice.toLocaleString()} / {(supplier.priceUnit ?? "").replace(/_/g, " ")}</dd></div>
              ) : null}
              <div className="col-span-2"><dt className="font-bold text-[#64748b]">Cancellation policy</dt><dd className="text-[#111827]">{supplier.cancellationPolicy || "Not specified"}</dd></div>
              {supplier.description ? (
                <div className="col-span-2"><dt className="font-bold text-[#64748b]">Description</dt><dd className="text-[#111827]">{supplier.description}</dd></div>
              ) : null}
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Packages" description="Services and pricing offered." />
            {supplier.services.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {supplier.services.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span className="text-[#111827]">{s.name}</span>
                    <span className="font-bold text-[#111827]">{s.price !== null ? `₱${s.price.toLocaleString()}` : "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#6b7280]">No packages configured.</p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Portfolio" description={`${supplier.portfolio.length} items`} />
            {supplier.portfolio.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {supplier.portfolio.map((p) => (
                  <div key={p.id} className="aspect-square overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#f8fafc]">
                    <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6b7280]">No portfolio items uploaded.</p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Review history" description="Immutable log of every decision made on this supplier." />
            {history && history.length > 0 ? (
              <ul className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-[#e5e7eb] p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111827]">{entry.action.replace(/_/g, " ")}</span>
                      <span className="text-xs text-[#9ca3af]">{formatDate(entry.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#6b7280]">by {entry.actorName ?? "Unknown"}</p>
                    {entry.reason ? <p className="mt-2 text-[#4b5563]">{entry.reason}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#6b7280]">No review activity yet.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Actions" />
            {actions.length > 0 ? (
              <ReviewActionBar entityId={supplier.id} actions={actions} onSubmit={submitReview} />
            ) : (
              <p className="text-sm text-[#6b7280]">No actions available for the current status, or you lack the required permission.</p>
            )}
          </Panel>
        </div>
      </div>
    </DashboardSubPage>
  );
}
