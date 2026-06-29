export const ROLES = {
  CUSTOMER: "customer",
  VENUE_OWNER: "venue_owner",
  EVENT_COORDINATOR: "event_coordinator",
  SUPPLIER: "supplier",
  ADMIN: "admin",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/**
 * Path prefix -> roles allowed to access it. Evaluated top-down in
 * middleware.ts; the first matching prefix wins, and a path matching no
 * prefix here is public.
 */
export const PROTECTED_ROUTES: { prefix: string; allow: RoleName[] }[] = [
  { prefix: "/admin", allow: [ROLES.ADMIN] },
  { prefix: "/owner", allow: [ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  { prefix: "/supplier", allow: [ROLES.SUPPLIER, ROLES.ADMIN] },
  {
    prefix: "/account",
    allow: [ROLES.CUSTOMER, ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.SUPPLIER, ROLES.ADMIN],
  },
];

/** Where to send someone immediately after login, based on their highest-priority role. */
export function defaultRouteForRoles(roles: RoleName[]): string {
  if (roles.includes(ROLES.ADMIN)) return "/admin";
  if (roles.includes(ROLES.VENUE_OWNER) || roles.includes(ROLES.EVENT_COORDINATOR)) return "/owner";
  if (roles.includes(ROLES.SUPPLIER)) return "/supplier";
  return "/account";
}
