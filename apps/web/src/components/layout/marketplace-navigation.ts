import { CalendarDays, Heart, Search, Store, type LucideIcon } from "lucide-react";

export type MarketplaceNavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type AuthPromptKind = "bookings" | "favorites" | "host" | "generic";

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

export function authPromptKindForHref(href: string): AuthPromptKind | null {
  if (href === "/bookings" || href.startsWith("/bookings/")) return "bookings";
  if (href === "/favorites" || href.startsWith("/favorites/")) {
    return "favorites";
  }
  if (
    href === "/account/become-partner" ||
    href.startsWith("/account/become-partner/")
  ) {
    return "host";
  }
  return null;
}

export function requiresAuthPrompt(href: string) {
  return authPromptKindForHref(href) !== null;
}

/** Always return the destination href; gated routes open an auth prompt instead of /login. */
export function resolveMarketplaceNavHref(
  href: string,
  _isAuthenticated: boolean,
) {
  return href;
}
