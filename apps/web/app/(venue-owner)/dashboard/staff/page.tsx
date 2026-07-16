import type { Metadata } from "next";
import {
  DashboardSubPage,
  DashButton,
  EmptyState,
} from "@/components/dashboard/enterprise";
import {
  formatDate,
  getOwnerDashboardContext,
} from "../_lib/owner-dashboard-data";
import {
  StaffManagementClient,
  type InvitationDisplayRow,
  type OrganizationOption,
  type StaffDisplayRow,
} from "./StaffManagementClient";

export const metadata: Metadata = { title: "Staff - Dashboard" };

type MemberRow = {
  organization_id: string;
  user_id: string;
  role: string;
  invited_at: string;
  status?: StaffDisplayRow["status"] | null;
};

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export default async function StaffPage() {
  const { supabase, user, isAdmin } = await getOwnerDashboardContext();

  let organizationsQuery = supabase
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true });

  if (!isAdmin) {
    organizationsQuery = organizationsQuery.eq("owner_id", user.id);
  }

  const { data: organizations } = await organizationsQuery;
  const organizationOptions: OrganizationOption[] = (organizations ?? []).map(
    (organization: { id: string; name: string }) => ({
      id: organization.id,
      name: organization.name,
    }),
  );
  const managedOrgIds = organizationOptions.map((organization) => organization.id);

  if (managedOrgIds.length === 0) {
    return (
      <DashboardSubPage
        title="Staff Management"
        description="Invite coordinators and manage access for organizations you own."
      >
        <EmptyState
          icon="lock"
          title="Staff management is owner-only"
          description="You can use your coordinator dashboard, but only organization owners can invite or change staff access."
          action={
            <DashButton href="/dashboard/coordinator" variant="secondary">
              Open Coordinator Dashboard
            </DashButton>
          }
        />
      </DashboardSubPage>
    );
  }

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id, user_id, role, invited_at, status")
      .in("organization_id", managedOrgIds)
      .order("invited_at", { ascending: false }),
    supabase
      .from("organization_member_invitations")
      .select("id, organization_id, email, status, expires_at, created_at")
      .in("organization_id", managedOrgIds)
      .order("created_at", { ascending: false }),
  ]);

  const memberRows = (members ?? []) as MemberRow[];
  const memberUserIds = [
    ...new Set(memberRows.map((member) => member.user_id)),
  ];

  const { data: profiles } =
    memberUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberUserIds)
      : { data: [] };

  const profileById = new Map<string, string>(
    (profiles ?? []).map((profile: { id: string; full_name: string }) => [
      profile.id,
      profile.full_name,
    ]),
  );
  const organizationById = new Map<string, string>(
    organizationOptions.map((organization) => [
      organization.id,
      organization.name,
    ]),
  );

  const staffRows: StaffDisplayRow[] = memberRows.map((member) => ({
    id: `${member.organization_id}-${member.user_id}`,
    organizationId: member.organization_id,
    userId: member.user_id,
    name: profileById.get(member.user_id) ?? "Team member",
    organization: organizationById.get(member.organization_id) ?? "Organization",
    role: member.role,
    status: member.status ?? "active",
    joined: formatDate(member.invited_at),
  }));

  const invitationRows: InvitationDisplayRow[] = (
    (invitations ?? []) as InvitationRow[]
  ).map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    organization:
      organizationById.get(invitation.organization_id) ?? "Organization",
    status: invitation.status,
    expiresAt: formatDate(invitation.expires_at),
    createdAt: formatDate(invitation.created_at),
  }));

  return (
    <DashboardSubPage
      title="Staff Management"
      description="Invite coordinators, review pending invitations, and control dashboard access."
    >
      <StaffManagementClient
        organizations={organizationOptions}
        staffRows={staffRows}
        invitationRows={invitationRows}
      />
    </DashboardSubPage>
  );
}
