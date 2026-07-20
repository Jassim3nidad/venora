import { CalendarDays, Heart, Search, Store, type LucideIcon } from "lucide-react";

export type MarketplaceNavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const MARKETPLACE_NAV_LINKS: MarketplaceNavLink[] = [
  { label: "Venues", href: "/venues", icon: Search },
  { label: "Suppliers", href: "/suppliers", icon: Store },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Favorites", href: "/favorites", icon: Heart },
];

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
