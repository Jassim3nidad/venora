import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DashboardSubPage,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import {
  hasPermission,
  requirePermissionOrRedirect,
} from "@/lib/rbac/admin-context";
import { DisputeCaseActions } from "@/src/features/admin-disputes/ui/DisputeCaseActions";

export const metadata: Metadata = { title: "Dispute Case - Admin" };
export const dynamic = "force-dynamic";

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatPeso(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";
  return `₱${Number(amount).toLocaleString("en-PH")}`;
}

function pretty(value: string) {
  return value.replace(/_/g, " ");
}

export default async function DisputeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermissionOrRedirect("disputes.view");
  const canManage = await hasPermission("disputes.manage");
  const canResolve = await hasPermission("disputes.resolve");

  const supabase = (await createClient()) as any;
  const { data: dispute, error } = await supabase
    .from("disputes")
    .select(
      `
      *,
      profiles!raised_by(full_name),
      venues(name),
      bookings(id, total_amount, event_date, status),
      resolver:profiles!resolved_by(full_name)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !dispute) {
    notFound();
  }

  const raisedBy = asOne(dispute.profiles);
  const venue = asOne(dispute.venues);
  const booking = asOne(dispute.bookings);
  const resolver = asOne(dispute.resolver);
  const evidenceUrls = Array.isArray(dispute.evidence_urls)
    ? (dispute.evidence_urls as string[]).filter(Boolean)
    : [];

  const canViewAudit = await hasPermission("audit_logs.view");
  const { data: auditRows } = canViewAudit
    ? await supabase
        .from("audit_logs")
        .select(
          "id, action, reason, created_at, actor_id, new_values, profiles:actor_id(full_name)",
        )
        .eq("entity_type", "dispute")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] as any[] };

  return (
    <DashboardSubPage
      title="Dispute case"
      description={`${pretty(dispute.category)} · ${venue?.name ?? "Venue"}`}
      action={
        <Link
          href="/admin/disputes"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a]"
        >
          Back to disputes
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Case details" />
          <div className="space-y-4 p-1">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                Status
              </p>
              <div className="mt-1">
                <StatusBadge status={dispute.status} />
              </div>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                Category
              </p>
              <p className="mt-1 font-semibold capitalize text-[#0f172a]">
                {pretty(dispute.category)}
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                Raised by
              </p>
              <p className="mt-1 font-semibold text-[#0f172a]">
                {raisedBy?.full_name ?? "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                Venue
              </p>
              <p className="mt-1 font-semibold text-[#0f172a]">
                {venue?.name ?? "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                Reason
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-[#334155]">
                {dispute.reason}
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                Evidence links
              </p>
              {evidenceUrls.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {evidenceUrls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-sm font-bold text-[#1d4ed8] hover:underline"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm font-semibold text-[#64748b]">
                  No evidence links provided.
                </p>
              )}
            </div>
            <p className="text-xs font-semibold text-[#64748b]">
              Opened{" "}
              {new Date(dispute.created_at).toLocaleString("en-PH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Booking context" />
          <div className="space-y-4 p-1">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                Booking
              </p>
              <p className="mt-1 break-all font-semibold text-[#0f172a]">
                {dispute.booking_id}
              </p>
            </div>
            {booking ? (
              <>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                    Amount
                  </p>
                  <p className="mt-1 font-semibold text-[#0f172a]">
                    {formatPeso(booking.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                    Booking status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                    Event date
                  </p>
                  <p className="mt-1 font-semibold text-[#0f172a]">
                    {booking.event_date
                      ? new Date(`${booking.event_date}T00:00:00`).toLocaleDateString(
                          "en-PH",
                          { dateStyle: "medium" },
                        )
                      : "—"}
                  </p>
                </div>
              </>
            ) : null}
            {dispute.transaction_id ? (
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                  Linked transaction
                </p>
                <p className="mt-1 break-all font-semibold text-[#0f172a]">
                  {dispute.transaction_id}
                </p>
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Case actions"
            description="Lifecycle: open → under review → resolved or rejected."
          />
          {["resolved", "rejected", "cancelled"].includes(dispute.status) ? (
            <div className="space-y-3 p-1">
              <StatusBadge status={dispute.status} />
              {dispute.resolved_at ? (
                <p className="text-sm font-semibold text-[#64748b]">
                  Closed{" "}
                  {new Date(dispute.resolved_at).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {resolver?.full_name ? ` by ${resolver.full_name}` : ""}
                </p>
              ) : null}
              {dispute.resolution_notes ? (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                    Resolution notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-[#334155]">
                    {dispute.resolution_notes}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <DisputeCaseActions
              disputeId={dispute.id}
              status={dispute.status}
              canManage={canManage}
              canResolve={canResolve}
            />
          )}
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Case activity"
            description="Audit trail for status transitions on this dispute."
          />
          {!canViewAudit ? (
            <p className="p-1 text-sm font-semibold text-[#64748b]">
              Case activity requires the audit_logs.view permission. Status still
              updates; open Audit Logs if you have access.
            </p>
          ) : (auditRows ?? []).length > 0 ? (
            <ul className="space-y-3 p-1">
              {(auditRows ?? []).map((row: any) => {
                const actor = asOne(row.profiles);
                const nextStatus =
                  row.new_values?.status ??
                  row.new_values?.p_new_status ??
                  null;
                return (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3"
                  >
                    <p className="text-sm font-bold text-[#0f172a]">
                      {pretty(String(row.action))}
                      {nextStatus ? ` → ${pretty(String(nextStatus))}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#64748b]">
                      {actor?.full_name ?? "System"} ·{" "}
                      {new Date(row.created_at).toLocaleString("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {row.reason ? (
                      <p className="mt-2 text-sm font-medium text-[#334155]">
                        {row.reason}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-1 text-sm font-semibold text-[#64748b]">
              No audited status transitions yet. Activity appears after an admin
              updates the case.
            </p>
          )}
        </Panel>
      </div>
    </DashboardSubPage>
  );
}
