/**
 * Single source of truth for all role definitions, route-role mappings,
 * and post-login redirects. Both proxy.ts and the server-side guard
 * utility import from here — never define role lists anywhere else.
 */

// ── Role constants ────────────────────────────────────────────────────────────

export const ROLES = {
  CUSTOMER:          "customer",
  VENUE_OWNER:       "venue_owner",
  EVENT_COORDINATOR: "event_coordinator",
  SUPPLIER:          "supplier",
  ADMIN:             "admin",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

// ── Display labels (for UI — never use raw role strings in templates) ─────────

export const ROLE_LABELS: Record<RoleName, string> = {
  customer:          "Customer",
  venue_owner:       "Venue Owner",
  event_coordinator: "Event Coordinator",
  supplier:          "Supplier",
  admin:             "Administrator",
};

// ── Route-role map ────────────────────────────────────────────────────────────
//
// Evaluated top-down in proxy.ts; the FIRST prefix that matches the
// current pathname wins (most-specific routes must come before catch-alls).
// A pathname that matches NO prefix here is treated as a public route.
//
// URL reality (Next.js route groups don't affect URL):
//   (admin)/admin/**             → /admin/**
//   (venue-owner)/dashboard/**   → /dashboard/**
//   (supplier)/dashboard/**      → /dashboard/**   (root page only)
//   (customer)/account           → /account
//   (customer)/bookings          → /bookings
//   (customer)/favorites         → /favorites

export const PROTECTED_ROUTES: { prefix: string; allow: RoleName[] }[] = [
  // ── Admin-only ────────────────────────────────────────────
  { prefix: "/admin",                allow: [ROLES.ADMIN] },

  // ── Dashboard sub-routes (venue-owner / event-coordinator specific) ───────
  // These must appear BEFORE the generic /dashboard catch-all.
  { prefix: "/dashboard/admin",      allow: [ROLES.ADMIN] },
  { prefix: "/dashboard/venue-owner", allow: [ROLES.VENUE_OWNER, ROLES.ADMIN] },
  { prefix: "/dashboard/event-coordinator", allow: [ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  { prefix: "/dashboard/coordinator", allow: [ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  { prefix: "/dashboard/supplier",   allow: [ROLES.SUPPLIER, ROLES.ADMIN] },
  { prefix: "/dashboard/venues/new", allow: [ROLES.VENUE_OWNER, ROLES.ADMIN] },
  { prefix: "/dashboard/venues",    allow: [ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  { prefix: "/dashboard/calendar",  allow: [ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  { prefix: "/dashboard/packages",  allow: [ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  { prefix: "/dashboard/staff",     allow: [ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  { prefix: "/dashboard/bookings",  allow: [ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  // analytics is accessible to suppliers too (read-only earnings view)
  { prefix: "/dashboard/analytics", allow: [ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.SUPPLIER, ROLES.ADMIN] },
  { prefix: "/dashboard/reviews",   allow: [ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.ADMIN] },
  { prefix: "/dashboard/customer",  allow: [ROLES.CUSTOMER, ROLES.ADMIN] },

  // ── Generic venue-owner dashboard root ────────────────────────────────────
  {
    prefix: "/dashboard",
    allow: [ROLES.VENUE_OWNER, ROLES.ADMIN],
  },

  // ── Authenticated-only (all roles) ────────────────────────────────────────
  { prefix: "/bookings",  allow: [ROLES.CUSTOMER, ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.SUPPLIER, ROLES.ADMIN] },
  { prefix: "/favorites", allow: [ROLES.CUSTOMER, ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.SUPPLIER, ROLES.ADMIN] },
  { prefix: "/account",   allow: [ROLES.CUSTOMER, ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.SUPPLIER, ROLES.ADMIN] },
];

// ── Post-login redirect ───────────────────────────────────────────────────────
//
// Evaluated against the user's role list after a successful sign-in.
// Higher-priority roles are checked first.

export function defaultRouteForRoles(roles: RoleName[]): string {
  if (roles.includes(ROLES.ADMIN))             return "/dashboard/admin";
  if (roles.includes(ROLES.VENUE_OWNER))       return "/dashboard/venue-owner";
  if (roles.includes(ROLES.EVENT_COORDINATOR)) return "/dashboard/event-coordinator";
  if (roles.includes(ROLES.SUPPLIER))          return "/dashboard/supplier";
  return "/";
}
