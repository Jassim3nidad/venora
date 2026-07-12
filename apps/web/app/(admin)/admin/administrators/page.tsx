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
import { requirePermissionOrRedirect, getCurrentAdminContext } from "@/lib/rbac/admin-context";
import { ADMIN_TIER_LABELS } from "@/lib/rbac/permissions";
import { getAdminAccounts } from "@/features/admin-access-control/application/queries";
import { AssignTierDialog } from "@/features/admin-access-control/ui/AssignTierDialog";
import type { AdminAccount } from "@/features/admin-access-control/types/admin-account.types";

export const metadata: Metadata = { title: "Administrators - Admin" };
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default async function AdminAccountsPage() {
  // Page-level check: middleware only confirms "is an admin"; viewing/
  // managing OTHER admins' tiers is gated by admin_accounts.view /
  // admin_roles.manage specifically.
  await requirePermissionOrRedirect("admin_accounts.view");

  const ctx = await getCurrentAdminContext();
  const canManageRoles = ctx?.permissions.has("admin_roles.manage") ?? false;

  const { accounts, error } = await getAdminAccounts();

  const columns: DataTableColumn<AdminAccount>[] = [
    {
      key: "name",
      header: "Administrator",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.fullName}</p>
          <p className="text-xs text-[#6b7280]">{row.email ?? "No email on file"}</p>
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      cell: (row) =>
        row.tier ? (
          <StatusBadge status={row.isActive ? "active" : "inactive"} label={ADMIN_TIER_LABELS[row.tier]} />
        ) : (
          <span className="text-[#6b7280]">Not yet assigned</span>
        ),
    },
    {
      key: "assigned",
      header: "Assigned",
      cell: (row) => (row.assignedAt ? formatDate(row.assignedAt) : "—"),
    },
    { key: "since", header: "Admin since", cell: (row) => formatDate(row.grantedAt) },
    ...(canManageRoles
      ? [
          {
            key: "actions",
            header: "Actions",
            cell: (row: AdminAccount) => (
              <AssignTierDialog userId={row.userId} fullName={row.fullName} currentTier={row.tier} />
            ),
          } satisfies DataTableColumn<AdminAccount>,
        ]
      : []),
  ];

  return (
    <DashboardSubPage
      title="Administrators"
      description="Every account holding the admin role, and the fine-grained tier that controls what they can do."
    >
      {error ? (
        <EmptyState
          icon="error"
          title="Could not load administrators"
          description={error}
        />
      ) : accounts && accounts.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Administrator accounts"
            description={
              canManageRoles
                ? "Assign a tier to control exactly what each administrator can do."
                : "You can view administrator accounts, but changing tiers requires the admin_roles.manage permission."
            }
          />
          <DataTable rows={accounts} columns={columns} keyFn={(row) => row.userId} />
        </Panel>
      ) : (
        <EmptyState
          icon="admin_panel_settings"
          title="No administrator accounts found"
          description="Admin accounts are provisioned manually and appear here once created."
        />
      )}
    </DashboardSubPage>
  );
}
