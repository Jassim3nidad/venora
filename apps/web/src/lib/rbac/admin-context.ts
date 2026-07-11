/**
 * Admin authorization context — the permission-aware layer on top of
 * rbac/guards.ts's role-based requireRole()/hasRole().
 *
 * Use this for anything that should be restricted to specific admin tiers
 * (e.g. "only finance_admin can override a commission") rather than "any
 * admin" (requireRole(ROLES.ADMIN) is still correct for that coarser case).
 *
 * Usage — Server Component / Server Action:
 *   import { requirePermission } from "@/lib/rbac/admin-context";
 *
 *   export async function suspendVenueAction(rawInput: unknown) {
 *     return createServerAction(schema, async (input) => {
 *       await requirePermission("venues.suspend");
 *       ...
 *     }, rawInput);
 *   }
 *
 * Authorization is always re-checked server-side against admin_user_roles /
 * admin_role_permissions (via the has_admin_permission() SQL function) on
 * every call — nothing here trusts client state. ADMIN_TIER_PERMISSIONS in
 * permissions.ts is for UI hints only.
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { ROLES } from "./roles";
import type { AdminPermission, AdminTier } from "./permissions";

export type AdminContext = {
  userId: string;
  tier: AdminTier | null;
  isActive: boolean;
  permissions: Set<AdminPermission>;
};

type AdminUserRoleRow = {
  tier: AdminTier;
  is_active: boolean;
};

/**
 * Resolves the current request's admin context (tier + permission set).
 * Memoized per request via React's cache() so multiple call sites (layout,
 * page, nested components) in the same render share one DB round trip.
 *
 * Returns null if the caller isn't authenticated or doesn't hold the
 * admin role at all — callers that need to *require* admin access should
 * use requirePermission()/requireAdminContext() instead of calling this
 * directly and forgetting the null check.
 */
export const getCurrentAdminContext = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = (roleRows ?? []).some((r: { role: string }) => r.role === ROLES.ADMIN);
  if (!isAdmin) return null;

  const { data: tierRow } = await (supabase.from("admin_user_roles") as any)
    .select("tier, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = tierRow as AdminUserRoleRow | null;

  if (!row) {
    // Admin account with no tier row yet (shouldn't happen once migration
    // 054's backfill has run, but a manually-provisioned admin could reach
    // this before a super_admin assigns them a tier) — treat as no
    // permissions rather than throwing, so `hasPermission` degrades safely.
    return { userId: user.id, tier: null, isActive: false, permissions: new Set() };
  }

  // admin_user_roles and admin_role_permissions are joined by `tier`, not by
  // a foreign key (a tier's permission set isn't per-row-unique, so it can't
  // be one) — PostgREST can't auto-embed this, hence the separate query
  // rather than a nested select.
  const { data: permissionRows } = await (supabase.from("admin_role_permissions") as any)
    .select("permission_key")
    .eq("tier", row.tier);

  const permissions = new Set(
    ((permissionRows ?? []) as { permission_key: AdminPermission }[]).map((p) => p.permission_key),
  );

  return { userId: user.id, tier: row.tier, isActive: row.is_active, permissions };
});

/**
 * Non-throwing permission check. Use for conditional UI rendering
 * (nav items, buttons) — NOT as the sole guard for a mutation.
 */
export async function hasPermission(permission: AdminPermission): Promise<boolean> {
  const ctx = await getCurrentAdminContext();
  return !!ctx && ctx.isActive && ctx.permissions.has(permission);
}

/**
 * Assert the caller is an active admin holding a specific permission.
 *
 * @throws {UnauthorizedError} when not signed in.
 * @throws {ForbiddenError}    when signed in but not an admin, inactive, or
 *                              missing the permission.
 */
export async function requirePermission(permission: AdminPermission): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthorizedError();

  const ctx = await getCurrentAdminContext();

  if (!ctx || !ctx.isActive || !ctx.permissions.has(permission)) {
    throw new ForbiddenError(`This action requires the "${permission}" permission.`);
  }

  return ctx;
}
