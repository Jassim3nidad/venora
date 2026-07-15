import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  requirePermissionOrRedirect,
  hasPermission,
} from "@/lib/rbac/admin-context";
import { ROLE_LABELS, type RoleName } from "@/lib/rbac/roles";
import {
  getUserDetailForAdmin,
  getAccountStatusHistory,
  getPartnerApplicationHistory,
} from "@/features/admin-users/application/queries";
import { setAccountStatusAction } from "@/features/admin-users/application/actions";
import {
  ReviewActionBar,
  type ReviewActionDef,
} from "@/components/admin/ReviewActionBar";

export const metadata: Metadata = { title: "User Detail - Admin" };
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actionsForStatus(
  status: string,
  canSuspend: boolean,
  canReactivate: boolean,
): ReviewActionDef[] {
  const actions: ReviewActionDef[] = [];
  if (
    (status === "active" || status === "pending_verification") &&
    canSuspend
  ) {
    actions.push({
      key: "suspend",
      label: "Suspend account",
      variant: "danger",
      requiresReason: true,
      reasonLabel: "Why is this account being suspended?",
    });
  }
  if (status === "suspended" && canReactivate) {
    actions.push({
      key: "reactivate",
      label: "Reactivate account",
      variant: "primary",
    });
  }
  return actions;
}

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  await requirePermissionOrRedirect("users.view");
  const { id } = await params;

  const [
    { user, error },
    { history },
    { applications },
    canSuspend,
    canReactivate,
  ] = await Promise.all([
    getUserDetailForAdmin(id),
    getAccountStatusHistory(id),
    getPartnerApplicationHistory(id),
    hasPermission("users.suspend"),
    hasPermission("users.reactivate"),
  ]);

  if (error === "Account not found") notFound();

  if (error || !user) {
    return (
      <DashboardSubPage title="User Detail">
        <EmptyState
          icon="error"
          title="Could not load this account"
          description={error ?? "Unknown error"}
        />
      </DashboardSubPage>
    );
  }

  const actions = actionsForStatus(user.status, canSuspend, canReactivate);

  async function submitStatusChange(input: {
    id: string;
    action: string;
    reason?: string;
  }) {
    "use server";
    return setAccountStatusAction({
      id: input.id,
      action: input.action as "suspend" | "reactivate",
      reason: input.reason,
    });
  }

  return (
    <DashboardSubPage
      title={user.fullName}
      description={user.email ?? "No email on file"}
      action={<StatusBadge status={user.status} />}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader title="Account details" />
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-bold text-[#64748b]">Role</dt>
                <dd className="text-[#111827]">
                  {user.role ? ROLE_LABELS[user.role as RoleName] : "No role"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-[#64748b]">Email verified</dt>
                <dd className="text-[#111827]">
                  {user.emailConfirmed ? "Yes" : "No"}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-[#64748b]">Registered</dt>
                <dd className="text-[#111827]">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-bold text-[#64748b]">Account status</dt>
                <dd className="text-[#111827]">
                  <StatusBadge status={user.status} />
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-[#6b7280]">
              Account status (active/suspended) and email verification are
              tracked separately — suspending an account never changes whether
              its email is confirmed, and vice versa.
            </p>
          </Panel>

          <Panel>
            <PanelHeader
              title="Partner application history"
              description="Requests to become a venue owner, supplier, or event coordinator."
            />
            {applications && applications.length > 0 ? (
              <ul className="space-y-3">
                {applications.map((app) => (
                  <li
                    key={app.id}
                    className="rounded-xl border border-[#e5e7eb] p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111827]">
                        {app.roleAppliedFor.replace(/_/g, " ")} · {app.category}
                      </span>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      {formatDate(app.createdAt)}
                    </p>
                    {app.denialReason ? (
                      <p className="mt-2 text-[#4b5563]">{app.denialReason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#6b7280]">
                No partner applications submitted.
              </p>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Account status history"
              description="Every suspend/reactivate decision, from the audit log."
            />
            {history && history.length > 0 ? (
              <ul className="space-y-3">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-[#e5e7eb] p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111827]">
                        {entry.action.replace(/_/g, ".").replace(/\./g, " ")}
                      </span>
                      <span className="text-xs text-[#6b7280]">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      by {entry.actorName ?? "Unknown"}
                    </p>
                    {entry.reason ? (
                      <p className="mt-2 text-[#4b5563]">{entry.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#6b7280]">
                No status changes recorded.
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Actions" />
            {actions.length > 0 ? (
              <ReviewActionBar
                entityId={user.id}
                actions={actions}
                onSubmit={submitStatusChange}
              />
            ) : (
              <p className="text-sm text-[#6b7280]">
                No actions available for the current status, or you lack the
                required permission.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </DashboardSubPage>
  );
}
