/**
 * Centralised TanStack Query key factory.
 *
 * Rules:
 * 1. All query keys MUST be defined here — never hardcode inline.
 * 2. Keys are structured from broad → specific (enables partial invalidation).
 * 3. Use `queryClient.invalidateQueries({ queryKey: queryKeys.X.all })` to
 *    invalidate all queries for a feature.
 *
 * @see docs/conventions/data-fetching.md
 */

export const queryKeys = {
  // ── Venues ─────────────────────────────────────────────────
  venues: {
    all:      ["venues"]                          as const,
    list:     (filters: Record<string, unknown>) => ["venues", "list",   filters] as const,
    detail:   (slug: string)                     => ["venues", "detail", slug]    as const,
    packages: (venueId: string)                  => ["venues", "packages", venueId] as const,
    blocks:   (venueId: string)                  => ["venues", "blocks",   venueId] as const,
  },

  // ── Bookings ───────────────────────────────────────────────
  bookings: {
    all:        ["bookings"]                                          as const,
    byCustomer: (customerId: string)             => ["bookings", "customer", customerId] as const,
    byVenue:    (venueId: string)                => ["bookings", "venue",    venueId]    as const,
    detail:     (bookingId: string)              => ["bookings", "detail",   bookingId]  as const,
  },

  // ── Suppliers ──────────────────────────────────────────────
  suppliers: {
    all:       ["suppliers"]                                          as const,
    list:      (filters: Record<string, unknown>) => ["suppliers", "list",  filters]    as const,
    detail:    (supplierId: string)              => ["suppliers", "detail", supplierId] as const,
    bySelf:    (ownerId: string)                 => ["suppliers", "self",   ownerId]    as const,
  },

  // ── Reviews ────────────────────────────────────────────────
  reviews: {
    all:      ["reviews"]                                             as const,
    byVenue:  (venueId: string)                  => ["reviews", "venue",    venueId]    as const,
    byCustomer: (customerId: string)             => ["reviews", "customer", customerId] as const,
  },

  // ── Favourites ─────────────────────────────────────────────
  favourites: {
    byCustomer: (customerId: string)             => ["favourites", customerId] as const,
  },

  // ── Analytics ──────────────────────────────────────────────
  analytics: {
    venue: (venueId: string, range: { from: string; to: string }) =>
      ["analytics", "venue", venueId, range] as const,
    platform: ["analytics", "platform"] as const,
  },

  // ── Auth / Profile ─────────────────────────────────────────
  auth: {
    session: ["auth", "session"]           as const,
    profile: (userId: string)              => ["auth", "profile", userId] as const,
  },

  // ── Search ─────────────────────────────────────────────────
  search: {
    results: (query: Record<string, unknown>) => ["search", "results", query] as const,
    ai:      (query: string)                  => ["search", "ai",      query] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
