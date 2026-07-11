import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminAccount } from "../types/admin-account.types";

type UserRoleRow = {
  user_id: string;
  granted_at: string;
  profiles: { full_name: string | null } | null;
};

type AdminUserRoleRow = {
  user_id: string;
  tier: string;
  is_active: boolean;
  assigned_at: string;
};

/**
 * Every account holding user_roles.role = 'admin', enriched with its
 * fine-grained tier (admin_user_roles) and auth email. Requires the
 * caller to already have admin_accounts.view — enforced by RLS on
 * admin_user_roles (self-or-permitted) and by the page/action calling
 * requirePermission() before rendering/mutating.
 */
export async function getAdminAccounts(): Promise<{
  accounts: AdminAccount[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data: rows, error } = await supabase
    .from("user_roles")
    .select(
      `
      user_id,
      granted_at,
      profiles:user_id (full_name)
    `,
    )
    .eq("role", "admin")
    .order("granted_at", { ascending: true });

  if (error) {
    return { accounts: null, error: error.message };
  }

  const adminUserIds = ((rows ?? []) as UserRoleRow[]).map((row) => row.user_id);

  // admin_user_roles isn't linked to user_roles by a foreign key (both are
  // independent tables keyed on user_id -> profiles), so PostgREST can't
  // auto-embed it — fetch tiers separately and merge in JS.
  const { data: tierRows, error: tierError } = adminUserIds.length
    ? await supabase
        .from("admin_user_roles")
        .select("user_id, tier, is_active, assigned_at")
        .in("user_id", adminUserIds)
    : { data: [] as AdminUserRoleRow[], error: null };

  if (tierError) {
    return { accounts: null, error: tierError.message };
  }

  const tierByUserId = new Map(
    ((tierRows ?? []) as AdminUserRoleRow[]).map((row) => [row.user_id, row]),
  );

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (adminError) {
    return {
      accounts: null,
      error:
        adminError instanceof Error
          ? adminError.message
          : "Supabase admin credentials are not configured.",
    };
  }

  const accounts = await Promise.all(
    ((rows ?? []) as UserRoleRow[]).map(async (row): Promise<AdminAccount> => {
      const { data: authUser } = await adminClient.auth.admin.getUserById(row.user_id);
      const tierRow = tierByUserId.get(row.user_id);

      return {
        userId: row.user_id,
        fullName: row.profiles?.full_name ?? "Unnamed admin",
        email: authUser?.user?.email ?? null,
        tier: (tierRow?.tier as AdminAccount["tier"]) ?? null,
        isActive: tierRow?.is_active ?? false,
        assignedAt: tierRow?.assigned_at ?? null,
        grantedAt: row.granted_at,
      };
    }),
  );

  return { accounts, error: null };
}
