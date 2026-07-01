/**
 * Server-side RBAC guard utilities.
 *
 * Use these inside Server Components, Server Actions, and Route Handlers
 * to enforce authentication and role requirements without duplicating the
 * Supabase fetch + role-check pattern across every page/action.
 *
 * Usage — Server Component:
 *   import { requireRole } from "@/lib/rbac/guards";
 *   import { ROLES } from "@/lib/rbac/roles";
 *
 *   export default async function AdminPage() {
 *     await requireRole(ROLES.ADMIN);          // throws ForbiddenError if wrong role
 *     ...
 *   }
 *
 * Usage — Server Action:
 *   export async function myAction() {
 *     const { userId, roles } = await requireAuth();
 *     ...
 *   }
 *
 * Thrown errors are VenoraError subclasses — the createServerAction() wrapper
 * in server-action.ts maps them to structured ApiResponse error envelopes
 * automatically. In Server Components / layouts, catch and redirect() instead:
 *
 *   try {
 *     await requireRole(ROLES.VENUE_OWNER);
 *   } catch {
 *     redirect("/unauthorized");
 *   }
 */

import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { RoleName } from "./roles";

export type SessionContext = {
  userId: string;
  roles: RoleName[];
};

// ── requireAuth ───────────────────────────────────────────────────────────────

/**
 * Assert that the caller is authenticated.
 * Does NOT check any specific role — any signed-in user passes.
 *
 * @throws {UnauthorizedError} when no session exists.
 */
export async function requireAuth(): Promise<SessionContext> {
  return requireRole(); // no role filter = authenticated only
}

// ── requireRole ───────────────────────────────────────────────────────────────

/**
 * Assert that the caller is authenticated AND holds at least one of the
 * specified roles. Pass no arguments to require auth only (same as requireAuth).
 *
 * @param allowedRoles — at least one must match; empty = any authenticated user.
 * @throws {UnauthorizedError} when no session exists.
 * @throws {ForbiddenError}    when the user is signed in but lacks every allowed role.
 */
export async function requireRole(...allowedRoles: RoleName[]): Promise<SessionContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (roleRows ?? [])
    .map((r: { role: string }) => r.role as RoleName)
    .filter(Boolean);

  if (allowedRoles.length > 0 && !allowedRoles.some((r) => roles.includes(r))) {
    throw new ForbiddenError(
      `This action requires one of: ${allowedRoles.join(", ")}. Your role(s): ${roles.join(", ") || "none"}.`
    );
  }

  return { userId: user.id, roles };
}

// ── hasRole ───────────────────────────────────────────────────────────────────

/**
 * Non-throwing helper — returns true if the current session has a given role.
 * Useful for conditional UI rendering in Server Components without try/catch.
 * Returns false when unauthenticated.
 */
export async function hasRole(...checkRoles: RoleName[]): Promise<boolean> {
  try {
    await requireRole(...checkRoles);
    return true;
  } catch {
    return false;
  }
}
