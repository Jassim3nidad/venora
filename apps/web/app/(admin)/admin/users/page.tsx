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
import { requirePermission } from "@/lib/rbac/admin-context";
import { ROLE_LABELS, ROLES, type RoleName } from "@/lib/rbac/roles";
import {
  getUsersForAdmin,
  USERS_PAGE_SIZE,
  type AccountStatusFilter,
  type RoleFilter,
  type UserAccountRow,
} from "@/features/admin-users/application/queries";

export const metadata: Metadata = { title: "Users - Admin" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS: { value: AccountStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending_verification", label: "Pending verification" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
];

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All roles" },
  ...(Object.values(ROLES) as RoleName[]).map((role) => ({ value: role, label: ROLE_LABELS[role] })),
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

type Props = {
  searchParams: Promise<{ role?: string; status?: string; search?: string; page?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  await requirePermission("users.view");

  const params = await searchParams;
  const role = (ROLE_OPTIONS.some((o) => o.value === params.role) ? params.role : "all") as RoleFilter;
  const status = (STATUS_OPTIONS.some((o) => o.value === params.status) ? params.status : "all") as AccountStatusFilter;
  const search = params.search?.trim() || undefined;
  const page = Math.max(Number(params.page) || 1, 1);

  const { users, total, error } = await getUsersForAdmin({ role, status, search, page });
  const totalPages = Math.max(Math.ceil(total / USERS_PAGE_SIZE), 1);

  function pageHref(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const merged = { role, status, search, page: String(page), ...overrides };
    Object.entries(merged).forEach(([key, value]) => {
      if (value && value !== "all") next.set(key, value);
    });
    return `/admin/users?${next.toString()}`;
  }

  const columns: DataTableColumn<UserAccountRow>[] = [
    {
      key: "user",
      header: "User",
      cell: (row) => (
        <a href={`/admin/users/${row.id}`} className="font-semibold text-[#111827] hover:text-[#1d4ed8] hover:underline">
          {row.fullName}
        </a>
      ),
    },
    { key: "email", header: "Email", cell: (row) => row.email ?? "—" },
    {
      key: "role",
      header: "Role",
      cell: (row) => (row.role ? <StatusBadge status="active" label={ROLE_LABELS[row.role]} /> : <span className="text-[#9ca3af]">No role</span>),
    },
    { key: "status", header: "Account status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "joined", header: "Joined", cell: (row) => formatDate(row.createdAt) },
  ];

  return (
    <DashboardSubPage title="Users" description="Search, filter, and manage platform accounts.">
      <Panel>
        <PanelHeader title="Filters" />
        <form method="GET" className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="sm:col-span-3 lg:col-span-2">
            <label htmlFor="search" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
              Search by name
            </label>
            <input
              id="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Full name"
              className="w-full rounded-xl border border-[#dbe3ef] p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
            />
          </div>
          <div>
            <label htmlFor="role" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
              Role
            </label>
            <select id="role" name="role" defaultValue={role} className="w-full rounded-xl border border-[#dbe3ef] p-2.5 text-sm">
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
              Account status
            </label>
            <select id="status" name="status" defaultValue={status} className="w-full rounded-xl border border-[#dbe3ef] p-2.5 text-sm">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-4">
            <button type="submit" className="inline-flex h-10 items-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white hover:bg-[#1e40af]">
              Apply filters
            </button>
            <a href="/admin/users" className="inline-flex h-10 items-center rounded-xl border border-[#e5e7eb] bg-white px-5 text-sm font-bold text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8]">
              Clear
            </a>
          </div>
        </form>
      </Panel>

      {error ? (
        <EmptyState icon="error" title="Could not load users" description={error} />
      ) : users && users.length > 0 ? (
        <Panel>
          <PanelHeader title="Accounts" description={`Showing ${users.length} of ${total} matching accounts.`} />
          <DataTable rows={users} columns={columns} keyFn={(row) => row.id} />

          {totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-between">
              <a
                href={page > 1 ? pageHref({ page: String(page - 1) }) : undefined}
                aria-disabled={page <= 1}
                className={`inline-flex h-9 items-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-bold ${page <= 1 ? "pointer-events-none opacity-40" : "text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8]"}`}
              >
                Previous
              </a>
              <span className="text-xs font-bold uppercase tracking-wide text-[#64748b]">Page {page} of {totalPages}</span>
              <a
                href={page < totalPages ? pageHref({ page: String(page + 1) }) : undefined}
                aria-disabled={page >= totalPages}
                className={`inline-flex h-9 items-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-bold ${page >= totalPages ? "pointer-events-none opacity-40" : "text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8]"}`}
              >
                Next
              </a>
            </div>
          ) : null}
        </Panel>
      ) : (
        <EmptyState icon="group" title="No users match these filters" description="Try a different search or filter combination." />
      )}
    </DashboardSubPage>
  );
}
