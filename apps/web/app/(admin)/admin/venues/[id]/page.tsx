import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import { requirePermissionOrRedirect, hasPermission } from "@/lib/rbac/admin-context";
import {
  getVenueForAdminReview,
  getVenueReviewHistory,
} from "@/features/venues/application/admin-queries";
import { reviewVenueAction } from "@/features/venues/application/admin-actions";
import type { VenueReviewAction } from "@/features/venues/types/venue-review-action.types";
import { ReviewActionBar, type ReviewActionDef } from "@/components/admin/ReviewActionBar";
import VenueMap from "@/components/VenueMap";

export const metadata: Metadata = { title: "Venue Review - Admin" };
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function actionsForStatus(status: string, canApprove: boolean, canReject: boolean, canReview: boolean, canSuspend: boolean): ReviewActionDef[] {
  const actions: ReviewActionDef[] = [];

  if (status === "pending_approval") {
    if (canApprove) actions.push({ key: "approve", label: "Approve", variant: "primary" });
    if (canReject) actions.push({ key: "reject", label: "Reject", variant: "danger", requiresReason: true, reasonLabel: "Why is this venue being rejected?" });
    if (canReview) actions.push({ key: "request_info", label: "Request more info", variant: "secondary", requiresReason: true, reasonLabel: "What additional information is needed?" });
  }
  if (status === "published") {
    if (canSuspend) actions.push({ key: "suspend", label: "Suspend", variant: "danger", requiresReason: true, reasonLabel: "Why is this venue being suspended?" });
    if (canSuspend) actions.push({ key: "unpublish", label: "Unpublish", variant: "secondary" });
  }
  if (status === "suspended" && canSuspend) {
    actions.push({ key: "restore", label: "Restore", variant: "primary" });
  }
  if (canReview) {
    actions.push({ key: "note", label: "Add note", variant: "secondary", requiresReason: true, reasonLabel: "Internal note" });
  }

  return actions;
}

type Props = { params: Promise<{ id: string }> };

export default async function AdminVenueDetailPage({ params }: Props) {
  await requirePermissionOrRedirect("venues.view");
  const { id } = await params;

  const [{ venue, error }, { history }, canApprove, canReject, canReview, canSuspend] = await Promise.all([
    getVenueForAdminReview(id),
    getVenueReviewHistory(id),
    hasPermission("venues.approve"),
    hasPermission("venues.reject"),
    hasPermission("venues.review"),
    hasPermission("venues.suspend"),
  ]);

  if (error === "Venue not found") notFound();

  if (error || !venue) {
    return (
      <DashboardSubPage title="Venue Review">
        <EmptyState icon="error" title="Could not load this venue" description={error ?? "Unknown error"} />
      </DashboardSubPage>
    );
  }

  const actions = actionsForStatus(venue.status, canApprove, canReject, canReview, canSuspend);

  async function submitReview(input: { id: string; action: string; reason?: string }) {
    "use server";
    return reviewVenueAction({ id: input.id, action: input.action as VenueReviewAction, reason: input.reason });
  }

  return (
    <DashboardSubPage
      title={venue.name}
      description={`${venue.organizationName ?? "Unknown organization"} · ${[venue.city, venue.province].filter(Boolean).join(", ")}`}
      action={<StatusBadge status={venue.status} />}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader title="Business details" />
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="font-bold text-[#64748b]">Owner</dt><dd className="text-[#111827]">{venue.ownerName ?? "—"}</dd></div>
              <div><dt className="font-bold text-[#64748b]">Organization</dt><dd className="text-[#111827]">{venue.organizationName ?? "—"}</dd></div>
              <div className="col-span-2"><dt className="font-bold text-[#64748b]">Address</dt><dd className="text-[#111827]">{venue.address}</dd></div>
              <div><dt className="font-bold text-[#64748b]">Capacity</dt><dd className="text-[#111827]">{venue.capacityMin ?? "—"}–{venue.capacityMax} guests</dd></div>
              <div><dt className="font-bold text-[#64748b]">Base price</dt><dd className="text-[#111827]">₱{venue.basePrice.toLocaleString()} / {venue.priceUnit.replace(/_/g, " ")}</dd></div>
              <div className="col-span-2"><dt className="font-bold text-[#64748b]">Cancellation policy</dt><dd className="text-[#111827]">{venue.cancellationPolicy || <span className="text-red-600">Missing — required before approval</span>}</dd></div>
              {venue.description ? (
                <div className="col-span-2"><dt className="font-bold text-[#64748b]">Description</dt><dd className="text-[#111827]">{venue.description}</dd></div>
              ) : null}
            </dl>
          </Panel>

          <Panel>
            <PanelHeader
              title="Location"
              {...(venue.latitude && venue.longitude ? {} : { description: "No coordinates on file — required before approval." })}
            />
            {venue.latitude && venue.longitude ? (
              <VenueMap latitude={venue.latitude} longitude={venue.longitude} interactive={false} markerLabel={venue.name} height="280px" />
            ) : (
              <EmptyState icon="location_off" title="No map coordinates" description="This venue has no latitude/longitude on file." />
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Photos" description={`${venue.images.length} uploaded — at least one is required before approval.`} />
            {venue.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {venue.images.map((img) => (
                  <div key={img.id} className="aspect-square overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#f8fafc]">
                    <img src={img.storagePath} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6b7280]">No photos uploaded yet.</p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Amenities & event types" />
            <div className="flex flex-wrap gap-2">
              {venue.amenities.map((a) => <StatusBadge key={a} status="active" label={a} />)}
              {venue.eventTypes.map((e) => <StatusBadge key={e} status="inactive" label={e} />)}
              {venue.amenities.length === 0 && venue.eventTypes.length === 0 ? (
                <span className="text-sm text-[#6b7280]">None specified.</span>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Review history" description="Immutable log of every decision made on this venue." />
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
              <ReviewActionBar entityId={venue.id} actions={actions} onSubmit={submitReview} />
            ) : (
              <p className="text-sm text-[#6b7280]">No actions available for the current status, or you lack the required permission.</p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Packages" />
            {venue.packages.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {venue.packages.map((pkg) => (
                  <li key={pkg.id} className="flex justify-between">
                    <span className="text-[#111827]">{pkg.name}</span>
                    <span className="font-bold text-[#111827]">₱{pkg.price.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#6b7280]">No packages configured.</p>
            )}
          </Panel>
        </div>
      </div>
    </DashboardSubPage>
  );
}
