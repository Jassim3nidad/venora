"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import {
  DashButton,
  DataTable,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  inviteCoordinatorAction,
  revokeInvitationAction,
  updateStaffStatusAction,
} from "./actions";

export type OrganizationOption = {
  id: string;
  name: string;
};

export type StaffDisplayRow = {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  organization: string;
  role: string;
  status: "active" | "suspended" | "revoked";
  joined: string;
};

export type InvitationDisplayRow = {
  id: string;
  email: string;
  organization: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type StaffManagementClientProps = {
  organizations: OrganizationOption[];
  staffRows: StaffDisplayRow[];
  invitationRows: InvitationDisplayRow[];
};

function prettyRole(role: string) {
  return role.replace(/_/g, " ");
}

export function StaffManagementClient({
  organizations,
  staffRows,
  invitationRows,
}: StaffManagementClientProps) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [email, setEmail] = useState("");
  const [invitePending, startInviteTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [invitationPending, startInvitationTransition] = useTransition();

  const selectedOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === selectedOrganizationId,
      ),
    [organizations, selectedOrganizationId],
  );

  const handleInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrganizationId) {
      toast.error("Choose an organization first.");
      return;
    }

    startInviteTransition(async () => {
      const result = await inviteCoordinatorAction({
        organizationId: selectedOrganizationId,
        email,
      });

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      setEmail("");
      toast.success(
        result.data.flow === "magic_link"
          ? `Coordinator sign-in email sent to ${result.data.email}.`
          : `Coordinator invitation sent to ${result.data.email}.`,
      );
    });
  };

  const updateStatus = (
    row: StaffDisplayRow,
    status: StaffDisplayRow["status"],
  ) => {
    startStatusTransition(async () => {
      const result = await updateStaffStatusAction({
        organizationId: row.organizationId,
        userId: row.userId,
        status,
      });

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      toast.success(`${row.name} is now ${status}.`);
    });
  };

  const revokeInvitation = (row: InvitationDisplayRow) => {
    startInvitationTransition(async () => {
      const result = await revokeInvitationAction({ invitationId: row.id });

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      toast.success(`Invitation for ${row.email} revoked.`);
    });
  };

  const staffColumns: DataTableColumn<StaffDisplayRow>[] = [
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
      cell: (row) => (
        <StatusBadge status="active" label={prettyRole(row.role)} />
      ),
    },
    {
      key: "status",
      header: "Access",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    { key: "joined", header: "Added", cell: (row) => row.joined },
    {
      key: "actions",
      header: "Actions",
      className: "w-[280px]",
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "active" ? (
            <DashButton
              variant="secondary"
              disabled={statusPending}
              onClick={() => updateStatus(row, "suspended")}
            >
              Suspend
            </DashButton>
          ) : (
            <DashButton
              variant="secondary"
              disabled={statusPending}
              onClick={() => updateStatus(row, "active")}
            >
              Reactivate
            </DashButton>
          )}
          {row.status !== "revoked" ? (
            <DashButton
              variant="danger"
              disabled={statusPending}
              onClick={() => updateStatus(row, "revoked")}
            >
              Revoke
            </DashButton>
          ) : null}
        </div>
      ),
    },
  ];

  const invitationColumns: DataTableColumn<InvitationDisplayRow>[] = [
    {
      key: "email",
      header: "Email",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.email}</p>
          <p className="text-xs text-[#6b7280]">{row.organization}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    { key: "expires", header: "Expires", cell: (row) => row.expiresAt },
    { key: "created", header: "Sent", cell: (row) => row.createdAt },
    {
      key: "actions",
      header: "Actions",
      className: "w-[160px]",
      cell: (row) =>
        row.status === "pending" ? (
          <DashButton
            variant="danger"
            disabled={invitationPending}
            onClick={() => revokeInvitation(row)}
          >
            Revoke
          </DashButton>
        ) : (
          <span className="text-xs font-semibold text-[#94a3b8]">
            No action
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-7">
      <Panel>
        <PanelHeader
          title="Invite Coordinator"
          description="Send a secure coordinator invitation tied to an organization you own."
        />
        <form
          onSubmit={handleInvite}
          className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_1fr_auto]"
        >
          <label className="flex flex-col gap-2 text-sm font-bold text-[#0f172a]">
            Organization
            <select
              value={selectedOrganizationId}
              onChange={(event) =>
                setSelectedOrganizationId(event.target.value)
              }
              className="h-12 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-[#0f172a]">
            Coordinator email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="coordinator@example.com"
              required
              className="h-12 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-semibold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            />
          </label>
          <div className="flex items-end">
            <DashButton
              type="submit"
              disabled={invitePending || !selectedOrganization}
              className="w-full lg:w-auto"
              icon="person_add"
            >
              {invitePending ? "Sending..." : "Send Invite"}
            </DashButton>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelHeader
          title="Organization Team"
          description="Active coordinators can use the coordinator dashboard for assigned organization work."
        />
        <DataTable
          rows={staffRows}
          columns={staffColumns}
          keyFn={(row) => row.id}
          emptyMessage="No coordinators have accepted an invitation yet."
        />
      </Panel>

      <Panel>
        <PanelHeader
          title="Pending Invitations"
          description="Invitation links expire after 7 days and can be revoked anytime."
        />
        <DataTable
          rows={invitationRows}
          columns={invitationColumns}
          keyFn={(row) => row.id}
          emptyMessage="No pending coordinator invitations."
        />
      </Panel>
    </div>
  );
}
