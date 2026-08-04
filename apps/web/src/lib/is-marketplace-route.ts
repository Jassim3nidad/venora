const MARKETPLACE_ROUTE_PREFIXES = [
  "/venues",
  "/suppliers",
  "/bookings",
  "/favorites",
  "/notifications",
  "/inquiries",
  "/owners",
] as const;

export function isMarketplaceRoute(pathname: string): boolean {
  return MARKETPLACE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isImmersiveVenueProfileRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "venues";
}

export function isAccountCenterRoute(pathname: string): boolean {
  return pathname === "/account" || pathname.startsWith("/account/");
}
