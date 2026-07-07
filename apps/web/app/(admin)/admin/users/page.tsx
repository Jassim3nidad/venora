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
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Users - Admin" };

type UserRow = {
  id: string;
  full_name: string | null;
  created_at: string;
  user_roles?: { role: string }[] | null;
};

type UserDisplayRow = {
  id: string;
  name: string;
  roles: string[];
  joined: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default async function AdminUsersPage() {
  const supabase = (await createClient()) as any;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, created_at, user_roles(role)")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows: UserDisplayRow[] = ((profiles ?? []) as UserRow[]).map((profile) => ({
    id: profile.id,
    name: profile.full_name ?? "Unnamed user",
    roles: (profile.user_roles ?? []).map((role) => role.role),
    joined: formatDate(profile.created_at),
  }));

  const columns: DataTableColumn<UserDisplayRow>[] = [
    {
      key: "name",
      header: "User",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.name}</span>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.roles.length > 0 ? (
            row.roles.map((role) => (
              <StatusBadge key={role} status="active" label={role.replace(/_/g, " ")} />
            ))
          ) : (
            <span className="text-[#6b7280]">No role</span>
          )}
        </div>
      ),
    },
    { key: "joined", header: "Joined", cell: (row) => row.joined },
  ];

  return (
    <DashboardSubPage
      title="Users"
      description="Review recent platform users and assigned roles."
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Recent Users"
            description="Showing the latest 50 user profiles."
          />
          <DataTable rows={rows} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="group"
          title="No users yet"
          description="User profiles will appear here after accounts are created."
        />
      )}
    </DashboardSubPage>
  );
}
