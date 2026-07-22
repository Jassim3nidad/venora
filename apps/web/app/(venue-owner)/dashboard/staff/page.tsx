import type { Metadata } from "next";
import {
  DashboardPage,
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
  venue_ids: string[] | null;
  expires_at: string;
  created_at: string;
};

type VenueRow = {
  id: string;
  organization_id: string;
  name: string;
};

type AssignmentRow = {
  organization_id: string;
  user_id: string;
  venue_id: string;
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

  const [
    { data: members },
    { data: invitations },
    { data: venues },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id, user_id, role, invited_at, status")
      .in("organization_id", managedOrgIds)
      .order("invited_at", { ascending: false }),
    supabase
      .from("organization_member_invitations")
      .select("id, organization_id, email, status, venue_ids, expires_at, created_at")
      .in("organization_id", managedOrgIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("venues")
      .select("id, organization_id, name")
      .in("organization_id", managedOrgIds)
      .order("name", { ascending: true }),
    supabase
      .from("venue_coordinator_assignments")
      .select("organization_id, user_id, venue_id")
      .in("organization_id", managedOrgIds),
  ]);

  const memberRows = (members ?? []) as MemberRow[];
  const coordinatorRows = memberRows.filter(
    (member) => member.role === "coordinator",
  );
  const venueRows = (venues ?? []) as VenueRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const memberUserIds = [
    ...new Set(coordinatorRows.map((member) => member.user_id)),
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
  const venueById = new Map<string, VenueRow>(
    venueRows.map((venue) => [venue.id, venue]),
  );
  const assignmentByMember = new Map<string, string[]>();

  for (const assignment of assignmentRows) {
    const key = `${assignment.organization_id}-${assignment.user_id}`;
    assignmentByMember.set(key, [
      ...(assignmentByMember.get(key) ?? []),
      assignment.venue_id,
    ]);
  }

  const staffRows: StaffDisplayRow[] = coordinatorRows.map((member) => ({
    id: `${member.organization_id}-${member.user_id}`,
    organizationId: member.organization_id,
    userId: member.user_id,
    name: profileById.get(member.user_id) ?? "Team member",
    organization: organizationById.get(member.organization_id) ?? "Organization",
    role: member.role,
    status: member.status ?? "active",
    assignedVenueIds:
      assignmentByMember.get(`${member.organization_id}-${member.user_id}`) ??
      [],
    assignedVenues: (
      assignmentByMember.get(`${member.organization_id}-${member.user_id}`) ??
      []
    )
      .map((venueId) => venueById.get(venueId)?.name)
      .filter(Boolean)
      .join(", "),
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
    assignedVenues: (invitation.venue_ids ?? [])
      .map((venueId) => venueById.get(venueId)?.name)
      .filter(Boolean)
      .join(", "),
    expiresAt: formatDate(invitation.expires_at),
    createdAt: formatDate(invitation.created_at),
  }));

  return (
    <DashboardPage className="space-y-5">
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0f172a]">
              Staff Management
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#64748b]">
              Invite coordinators, review pending invitations, and control
              dashboard access.
            </p>
          </div>
          <p className="text-sm font-semibold text-[#64748b]">
            {organizationOptions.length} organization
            {organizationOptions.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <StaffManagementClient
        organizations={organizationOptions}
        venues={venueRows}
        staffRows={staffRows}
        invitationRows={invitationRows}
      />
    </DashboardPage>
  );
}
