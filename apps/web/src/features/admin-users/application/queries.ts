import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RoleName } from "@/lib/rbac/roles";

export type AccountStatusFilter = "all" | "active" | "pending_verification" | "suspended" | "banned";
export type RoleFilter = "all" | RoleName;

export type UserAccountRow = {
  id: string;
  fullName: string;
  email: string | null;
  role: RoleName | null;
  status: string;
  createdAt: string;
};

const PAGE_SIZE = 25;

export async function getUsersForAdmin(filters: {
  role?: RoleFilter | undefined;
  status?: AccountStatusFilter | undefined;
  search?: string | undefined;
  page?: number | undefined;
}): Promise<{ users: UserAccountRow[] | null; total: number; error: string | null }> {
  const supabase = (await createClient()) as any;
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let rawRows: any[] = [];
  let count = 0;
  let error: { message: string } | null = null;

  if (filters.role && filters.role !== "all") {
    // Filtering by role means starting from user_roles (profiles has no
    // role column — it's a separate 1:1 table since migration 022) and
    // inner-joining profiles so the filter actually restricts top-level
    // rows rather than just the embedded resource.
    let query = supabase
      .from("user_roles")
      .select("user_id, profiles!inner(id, full_name, status, created_at)", { count: "exact" })
      .eq("role", filters.role)
      .order("granted_at", { ascending: false })
      .range(from, to);

    if (filters.status && filters.status !== "all") query = query.eq("profiles.status", filters.status);
    if (filters.search) query = query.ilike("profiles.full_name", `%${filters.search}%`);

    const { data, count: c, error: e } = await query;
    if (e) error = e;
    count = c ?? 0;
    rawRows = ((data ?? []) as any[]).map((row) => ({ ...row.profiles, role: filters.role }));
  } else {
    let query = supabase
      .from("profiles")
      .select("id, full_name, status, created_at, user_roles(role)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.search) query = query.ilike("full_name", `%${filters.search}%`);

    const { data, count: c, error: e } = await query;
    if (e) error = e;
    count = c ?? 0;
    rawRows = ((data ?? []) as any[]).map((row) => ({
      ...row,
      role: Array.isArray(row.user_roles) ? (row.user_roles[0]?.role ?? null) : (row.user_roles?.role ?? null),
    }));
  }

  if (error) return { users: null, total: 0, error: error.message };

  let adminClient: ReturnType<typeof createAdminClient> | null = null;
  try {
    adminClient = createAdminClient();
  } catch {
    adminClient = null; // Email enrichment is best-effort; don't fail the whole list over it.
  }

  const users: UserAccountRow[] = await Promise.all(
    rawRows.map(async (row) => {
      const email = adminClient ? (await adminClient.auth.admin.getUserById(row.id)).data.user?.email ?? null : null;
      return {
        id: row.id,
        fullName: row.full_name ?? "Unnamed user",
        email,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
      };
    }),
  );

  return { users, total: count, error: null };
}

export type UserAccountDetail = UserAccountRow & {
  emailConfirmed: boolean;
};

export async function getUserDetailForAdmin(userId: string): Promise<{
  user: UserAccountDetail | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, status, created_at, user_roles(role)")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { user: null, error: error.message };
  if (!profile) return { user: null, error: "Account not found" };

  let email: string | null = null;
  let emailConfirmed = false;
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient.auth.admin.getUserById(userId);
    email = data.user?.email ?? null;
    emailConfirmed = !!data.user?.email_confirmed_at;
  } catch {
    // Email enrichment is best-effort.
  }

  return {
    user: {
      id: profile.id,
      fullName: profile.full_name ?? "Unnamed user",
      email,
      emailConfirmed,
      role: Array.isArray(profile.user_roles) ? (profile.user_roles[0]?.role ?? null) : (profile.user_roles?.role ?? null),
      status: profile.status,
      createdAt: profile.created_at,
    },
    error: null,
  };
}

export type AccountHistoryEntry = {
  id: string;
  action: string;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
};

/**
 * Account-status change history for this user, sourced from audit_logs
 * (entity_type='profile') rather than a dedicated history table — there's
 * no multi-stage review workflow for account status the way there is for
 * venues/suppliers, just a single boolean-ish suspend/reactivate toggle,
 * so a separate table would just duplicate what audit_logs already gives us.
 */
export async function getAccountStatusHistory(userId: string): Promise<{
  history: AccountHistoryEntry[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, reason, created_at, profiles:actor_id (full_name)")
    .eq("entity_type", "profile")
    .eq("entity_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { history: null, error: error.message };

  const history: AccountHistoryEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    action: row.action,
    reason: row.reason,
    actorName: row.profiles?.full_name ?? null,
    createdAt: row.created_at,
  }));

  return { history, error: null };
}

export type PartnerApplicationSummary = {
  id: string;
  roleAppliedFor: string;
  status: string;
  category: string;
  denialReason: string | null;
  createdAt: string;
};

export async function getPartnerApplicationHistory(userId: string): Promise<{
  applications: PartnerApplicationSummary[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("partner_applications")
    .select("id, role_applied_for, status, category, denial_reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { applications: null, error: error.message };

  const applications: PartnerApplicationSummary[] = (data ?? []).map((row: any) => ({
    id: row.id,
    roleAppliedFor: row.role_applied_for,
    status: row.status,
    category: row.category,
    denialReason: row.denial_reason,
    createdAt: row.created_at,
  }));

  return { applications, error: null };
}

export { PAGE_SIZE as USERS_PAGE_SIZE };
