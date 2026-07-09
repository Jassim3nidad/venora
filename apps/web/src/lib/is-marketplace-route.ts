const MARKETPLACE_ROUTE_PREFIXES = [
  "/venues",
  "/suppliers",
  "/bookings",
  "/favorites",
  "/notifications",
] as const;

export function isMarketplaceRoute(pathname: string): boolean {
  return MARKETPLACE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
