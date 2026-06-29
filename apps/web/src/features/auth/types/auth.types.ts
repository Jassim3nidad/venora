import type { RoleName } from "@/lib/rbac/roles";

/** The application-level view of "who is logged in" — assembled from auth.users + profiles + user_roles. */
export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  status: "active" | "pending_verification" | "suspended" | "banned";
  roles: RoleName[];
};

/**
 * Standard return shape for every auth Server Action. `data` is generic
 * because actions that redirect on success (login, register) never actually
 * return — TypeScript still needs the success branch typed for the actions
 * that don't redirect (forgot-password, update-profile).
 */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
