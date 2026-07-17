import { ROLES, defaultRouteForRoles, type RoleName, PROTECTED_ROUTES } from "@/lib/rbac/roles";

export const PROFILE_SETUP_PATH = "/profile/setup";

export const PROFILE_SETUP_EXEMPT_PREFIXES = [
  "/profile/setup",
  "/logout",
  "/auth/callback",
  "/auth/session",
  "/confirm",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/staff/accept",
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
  if (path.length > 2048) return false;
  if (!path.startsWith("/")) return false;

  const variants = [path];
  let decoded = path;

  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
      variants.push(decoded);
    } catch {
      return false;
    }
  }

  // Browsers normalize backslashes to forward slashes when resolving a URL,
  // so "/\evil.com" (passes a naive "//" check) becomes the protocol-relative
  // "//evil.com" once the Location header is followed. Reject that class of
  // input by re-checking after normalizing backslashes.
  for (const candidate of variants) {
    const normalized = candidate.replace(/\\/g, "/");
    if (!normalized.startsWith("/")) return false;
    if (normalized.startsWith("//")) return false;

    // Reject anything carrying an embedded scheme (e.g. "/x:\evil.com" or a
    // javascript:/data: URI smuggled past the leading slash) or control
    // characters that could be used to trick URL parsers.
    if (/[\x00-\x1f\x7f]/.test(candidate)) return false;
    if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized)) return false;
  }

  const resolved = new URL(decoded, "https://venora.local");
  if (resolved.origin !== "https://venora.local") return false;

  if (
    resolved.pathname === "/login" ||
    resolved.pathname === "/register" ||
    resolved.pathname === "/forgot-password" ||
    resolved.pathname === "/reset-password" ||
    resolved.pathname.startsWith("/auth/")
  ) {
    return false;
  }

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
  if (isSafeInternalRedirect(redirectTo)) {
    const redirectPath = new URL(redirectTo!, "https://venora.local").pathname;
    if (isProfileSetupExemptPath(redirectPath)) return redirectTo!;
  }

  if (needsProfileSetup(roles, profile)) {
    return PROFILE_SETUP_PATH;
  }

  if (isSafeInternalRedirect(redirectTo)) {
    const redirectPath = new URL(redirectTo!, "https://venora.local").pathname;
    
    const matchedRoute = PROTECTED_ROUTES.find(
      (route) => redirectPath === route.prefix || redirectPath.startsWith(`${route.prefix}/`)
    );

    if (matchedRoute) {
      const isAllowed = roles.some((r) => matchedRoute.allow.includes(r));
      if (isAllowed) return redirectTo!;
    } else {
      return redirectTo!;
    }
  }

  return defaultRouteForRoles(roles);
}
