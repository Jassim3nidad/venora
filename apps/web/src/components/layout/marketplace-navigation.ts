export const MARKETPLACE_NAV_LINKS = [
  { label: "Browse", href: "/venues" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Bookings", href: "/bookings" },
  { label: "Favorites", href: "/favorites" },
] as const;

const MARKETPLACE_PREFIXES = MARKETPLACE_NAV_LINKS.map((item) => item.href);

export function isMarketplaceParentActive(pathname: string) {
  return MARKETPLACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isMarketplaceNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveMarketplaceNavHref(
  href: string,
  isAuthenticated: boolean,
) {
  if (isAuthenticated || (href !== "/bookings" && href !== "/favorites")) {
    return href;
  }

  const params = new URLSearchParams({
    redirectTo: href,
    prompt: href === "/bookings" ? "bookings" : "favorites",
  });

  return `/login?${params.toString()}`;
}
