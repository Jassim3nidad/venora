import { ROLES, defaultRouteForRoles, type RoleName } from "@/lib/rbac/roles";

export const PROFILE_SETUP_PATH = "/profile/setup";

export const PROFILE_SETUP_EXEMPT_PREFIXES = [
  "/profile/setup",
  "/logout",
  "/auth/callback",
  "/confirm",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api",
] as const;

export type ProfileSetupState = {
  profile_setup_completed_at: string | null;
};

export type ProfilePreferences = {
  emailNotifications?: boolean;
  bookingReminders?: boolean;
  marketingEmails?: boolean;
  preferredEventTypes?: string[];
};

export function isProfileSetupExemptPath(pathname: string) {
  return PROFILE_SETUP_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function needsProfileSetup(
  roles: RoleName[],
  profile: ProfileSetupState | null | undefined,
) {
  if (!roles.includes(ROLES.CUSTOMER)) return false;
  return !profile?.profile_setup_completed_at;
}

export function isSafeInternalRedirect(path: string | null | undefined) {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

export function resolvePostAuthRedirect({
  roles,
  profile,
  redirectTo,
}: {
  roles: RoleName[];
  profile: ProfileSetupState | null | undefined;
  redirectTo?: string | null;
}) {
  if (needsProfileSetup(roles, profile)) {
    return PROFILE_SETUP_PATH;
  }

  if (isSafeInternalRedirect(redirectTo)) {
    return redirectTo!;
  }

  return defaultRouteForRoles(roles);
}
