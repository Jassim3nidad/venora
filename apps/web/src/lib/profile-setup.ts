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
  if (!path.startsWith("/")) return false;

  // Browsers normalize backslashes to forward slashes when resolving a URL,
  // so "/\evil.com" (passes a naive "//" check) becomes the protocol-relative
  // "//evil.com" once the Location header is followed. Reject that class of
  // input by re-checking after normalizing backslashes.
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("//")) return false;

  // Reject anything carrying an embedded scheme (e.g. "/x:\evil.com" or a
  // javascript:/data: URI smuggled past the leading slash) or control
  // characters that could be used to trick URL parsers.
  if (/^[\x00-\x1f]/.test(path) || /[\x00-\x1f]/.test(path)) return false;
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized)) return false;

  return true;
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
