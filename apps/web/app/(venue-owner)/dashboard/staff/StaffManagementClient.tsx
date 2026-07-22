"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
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
  updateStaffVenueAssignmentsAction,
  updateStaffStatusAction,
} from "./actions";

export type OrganizationOption = {
  id: string;
  name: string;
};

export type VenueOption = {
  id: string;
  organization_id: string;
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
  assignedVenueIds: string[];
  assignedVenues: string;
  joined: string;
};

export type InvitationDisplayRow = {
  id: string;
  email: string;
  organization: string;
  status: string;
  assignedVenues: string;
  expiresAt: string;
  createdAt: string;
};

type StaffManagementClientProps = {
  organizations: OrganizationOption[];
  venues: VenueOption[];
  staffRows: StaffDisplayRow[];
  invitationRows: InvitationDisplayRow[];
};

function prettyRole(role: string) {
  return role.replace(/_/g, " ");
}

export function StaffManagementClient({
  organizations,
  venues,
  staffRows,
  invitationRows,
}: StaffManagementClientProps) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [email, setEmail] = useState("");
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, string[]>
  >({});
  const [invitePending, startInviteTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [invitationPending, startInvitationTransition] = useTransition();
  const [assignmentPending, startAssignmentTransition] = useTransition();

  const selectedOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === selectedOrganizationId,
      ),
    [organizations, selectedOrganizationId],
  );
  const selectedOrganizationVenues = useMemo(
    () =>
      venues.filter(
        (venue) => venue.organization_id === selectedOrganizationId,
      ),
    [selectedOrganizationId, venues],
  );

  useEffect(() => {
    setSelectedVenueIds((current) => {
      const validIds = selectedOrganizationVenues.map((venue) => venue.id);
      const retained = current.filter((venueId) => validIds.includes(venueId));
      return retained.length > 0
        ? retained
        : selectedOrganizationVenues[0]
          ? [selectedOrganizationVenues[0].id]
          : [];
    });
  }, [selectedOrganizationVenues]);

  useEffect(() => {
    setAssignmentDrafts(
      Object.fromEntries(
        staffRows.map((row) => [row.id, row.assignedVenueIds]),
      ),
    );
  }, [staffRows]);

  const toggleInviteVenue = (venueId: string) => {
    setSelectedVenueIds((current) =>
      current.includes(venueId)
        ? current.filter((id) => id !== venueId)
        : [...current, venueId],
    );
  };

  const toggleStaffVenue = (row: StaffDisplayRow, venueId: string) => {
    setAssignmentDrafts((current) => {
      const selected = current[row.id] ?? row.assignedVenueIds;
      return {
        ...current,
        [row.id]: selected.includes(venueId)
          ? selected.filter((id) => id !== venueId)
          : [...selected, venueId],
      };
    });
  };

  const handleInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrganizationId) {
      toast.error("Choose an organization first.");
      return;
    }

    if (selectedVenueIds.length === 0) {
      toast.error("Choose at least one venue for this coordinator.");
      return;
    }

    startInviteTransition(async () => {
      const result = await inviteCoordinatorAction({
        organizationId: selectedOrganizationId,
        email,
        venueIds: selectedVenueIds,
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

  const saveVenueAssignments = (row: StaffDisplayRow) => {
    const venueIds = assignmentDrafts[row.id] ?? [];

    if (venueIds.length === 0) {
      toast.error("Choose at least one venue for this coordinator.");
      return;
    }

    startAssignmentTransition(async () => {
      const result = await updateStaffVenueAssignmentsAction({
        organizationId: row.organizationId,
        userId: row.userId,
        venueIds,
      });

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      toast.success(`Venue access updated for ${row.name}.`);
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
    {
      key: "venues",
      header: "Assigned Venues",
      cell: (row) => {
        if (!row.assignedVenues) {
          return (
            <span className="text-sm font-semibold text-[#475569]">
              No venues assigned
            </span>
          );
        }
        
        const venues = row.assignedVenues.split(", ");
        const show = venues.slice(0, 2);
        const hiddenCount = venues.length - 2;

        return (
          <div className="flex flex-wrap gap-1.5 py-1">
            {show.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold leading-snug text-[#475569]"
              >
                {v}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span
                className="inline-flex cursor-help items-center rounded-md bg-[#eff6ff] px-2 py-0.5 text-[11px] font-extrabold text-[#1d4ed8]"
                title={venues.slice(2).join("\n")}
              >
                +{hiddenCount} more
              </span>
            )}
          </div>
        );
      },
    },
    { key: "joined", header: "Added", cell: (row) => <span className="whitespace-nowrap">{row.joined}</span> },
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
      key: "venues",
      header: "Assigned Venues",
      cell: (row) => {
        if (!row.assignedVenues) {
          return (
            <span className="text-sm font-semibold text-[#475569]">
              No venues selected
            </span>
          );
        }
        
        const venues = row.assignedVenues.split(", ");
        const show = venues.slice(0, 2);
        const hiddenCount = venues.length - 2;

        return (
          <div className="flex flex-wrap gap-1.5 py-1">
            {show.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-[11px] font-bold leading-snug text-[#475569]"
              >
                {v}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span
                className="inline-flex cursor-help items-center rounded-md bg-[#eff6ff] px-2 py-0.5 text-[11px] font-extrabold text-[#1d4ed8]"
                title={venues.slice(2).join("\n")}
              >
                +{hiddenCount} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    { key: "expires", header: "Expires", cell: (row) => <span className="whitespace-nowrap">{row.expiresAt}</span> },
    { key: "created", header: "Sent", cell: (row) => <span className="whitespace-nowrap">{row.createdAt}</span> },
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

  const activeCoordinatorCount = staffRows.filter(
    (row) => row.status === "active",
  ).length;
  const pendingInvitationCount = invitationRows.filter(
    (row) => row.status === "pending",
  ).length;
  const selectedVenueCount = selectedVenueIds.length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Coordinators", staffRows.length.toString()],
          ["Active access", activeCoordinatorCount.toString()],
          ["Pending invites", pendingInvitationCount.toString()],
          ["Managed venues", selectedOrganizationVenues.length.toString()],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 shadow-sm shadow-slate-200/50"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#0f172a]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <Panel className="rounded-2xl">
        <PanelHeader
          title="Invite coordinator"
          description="Choose an organization, enter the coordinator email, then assign the venues they can manage."
        />
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,380px)_1fr]">
          <form onSubmit={handleInvite} className="space-y-4">
            <label className="flex flex-col gap-2 text-sm font-bold text-[#0f172a]">
              Organization
              <select
                value={selectedOrganizationId}
                onChange={(event) =>
                  setSelectedOrganizationId(event.target.value)
                }
                className="h-11 rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
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
                className="h-11 rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
              />
            </label>
            <DashButton
              type="submit"
              disabled={
                invitePending ||
                !selectedOrganization ||
                selectedVenueIds.length === 0
              }
              className="w-full rounded-xl"
              icon="person_add"
            >
              {invitePending ? "Sending..." : "Send invite"}
            </DashButton>
          </form>

          <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-[#0f172a]">Venue access</p>
              <p className="text-xs font-semibold text-[#64748b]">
                {selectedVenueCount} selected
              </p>
            </div>
            {selectedOrganizationVenues.length > 0 ? (
              <div className="mt-3 grid max-h-[260px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {selectedOrganizationVenues.map((venue) => (
                  <label
                    key={venue.id}
                    className="flex min-h-10 items-start gap-2 rounded-lg border border-[#dbe3ef] bg-white px-3 py-2 text-sm font-semibold text-[#0f172a]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVenueIds.includes(venue.id)}
                      onChange={() => toggleInviteVenue(venue.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-[#2563eb]"
                    />
                    <span className="min-w-0 text-[13px] leading-snug">
                      {venue.name}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-[#cbd5e1] bg-white p-4 text-sm font-semibold text-[#64748b]">
                Add a venue before inviting a coordinator.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="rounded-2xl">
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

      <Panel className="rounded-2xl">
        <PanelHeader
          title="Venue Access"
          description="Choose the specific venues each active coordinator can manage."
        />
        {staffRows.length > 0 ? (
          <div className="grid gap-4">
            {staffRows.map((row) => {
              const rowVenues = venues.filter(
                (venue) => venue.organization_id === row.organizationId,
              );
              const selected = assignmentDrafts[row.id] ?? [];

              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-[#e5e7eb] bg-white p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-bold text-[#111827]">{row.name}</p>
                      <p className="text-xs font-semibold text-[#64748b]">
                        {row.organization}
                      </p>
                    </div>
                    <DashButton
                      variant="secondary"
                      disabled={assignmentPending || row.status !== "active"}
                      onClick={() => saveVenueAssignments(row)}
                    >
                      Save venues
                    </DashButton>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {rowVenues.map((venue) => (
                      <label
                        key={venue.id}
                        className="flex min-h-10 items-start gap-2 rounded-lg border border-[#dbe3ef] bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[#0f172a]"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(venue.id)}
                          onChange={() => toggleStaffVenue(row, venue.id)}
                          disabled={row.status !== "active"}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-[#2563eb]"
                        />
                        <span className="min-w-0 text-[13px] leading-snug">
                          {venue.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm font-semibold text-[#64748b]">
            Accepted coordinators will appear here after they accept an
            invitation.
          </p>
        )}
      </Panel>

      <Panel className="rounded-2xl">
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
