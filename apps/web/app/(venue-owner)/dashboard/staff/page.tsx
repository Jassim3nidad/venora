import type { Metadata } from "next";
import {
  DashboardSubPage,
  DashButton,
  DataTable,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  formatDate,
  getOwnerDashboardContext,
} from "../_lib/owner-dashboard-data";

export const metadata: Metadata = { title: "Staff - Dashboard" };

type MemberRow = {
  organization_id: string;
  user_id: string;
  role: string;
  invited_at: string;
};

type StaffDisplayRow = {
  id: string;
  name: string;
  organization: string;
  role: string;
  joined: string;
};

export default async function StaffPage() {
  const { supabase, orgIds, isAdmin } = await getOwnerDashboardContext();

  let membersQuery = supabase
    .from("organization_members")
    .select("organization_id, user_id, role, invited_at")
    .order("invited_at", { ascending: false });
  if (!isAdmin) membersQuery = membersQuery.in("organization_id", orgIds);

  const { data: members } =
    isAdmin || orgIds.length > 0 ? await membersQuery : { data: [] };

  const memberRows = (members ?? []) as MemberRow[];
  const memberUserIds = [...new Set(memberRows.map((member) => member.user_id))];
  const memberOrgIds = [
    ...new Set(memberRows.map((member) => member.organization_id)),
  ];

  const { data: profiles } =
    memberUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberUserIds)
      : { data: [] };

  const { data: organizations } =
    memberOrgIds.length > 0
      ? await supabase
          .from("organizations")
          .select("id, name")
          .in("id", memberOrgIds)
      : { data: [] };

  const profileById = new Map<string, string>(
    (profiles ?? []).map((profile: { id: string; full_name: string }) => [
      profile.id,
      profile.full_name,
    ]),
  );
  const organizationById = new Map<string, string>(
    (organizations ?? []).map((organization: { id: string; name: string }) => [
      organization.id,
      organization.name,
    ]),
  );

  const rows: StaffDisplayRow[] = memberRows.map((member) => ({
    id: `${member.organization_id}-${member.user_id}`,
    name: profileById.get(member.user_id) ?? "Team member",
    organization: organizationById.get(member.organization_id) ?? "Organization",
    role: member.role,
    joined: formatDate(member.invited_at),
  }));

  const columns: DataTableColumn<StaffDisplayRow>[] = [
    {
      key: "name",
      header: "Team Member",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.name}</p>
          <p className="text-xs text-[#6b7280]">{row.organization}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => <StatusBadge status={row.role} label={row.role.replace(/_/g, " ")} />,
    },
    { key: "joined", header: "Added", cell: (row) => row.joined },
  ];

  return (
    <DashboardSubPage
      title="Staff Management"
      description="Review organization members who can help manage venues and operations."
      action={
        rows.length > 0 ? (
          <DashButton href="/account" variant="secondary" icon="manage_accounts">
            Account Settings
          </DashButton>
        ) : null
      }
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Organization Team"
            description="Team membership is shown from your organization records."
          />
          <DataTable rows={rows} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="groups"
          title="No staff members yet"
          description="Invite and permission workflows are not active yet. Team members will appear here after they are added to your organization."
          action={
            <DashButton href="/account" variant="secondary" icon="manage_accounts">
              Review Account
            </DashButton>
          }
        />
      )}
    </DashboardSubPage>
  );
}
