"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Heart,
  HelpCircle,
  LogOut,
  Menu,
  Store,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { AuthRequiredPrompt } from "@/components/layout/AuthRequiredPrompt";
import ProfileMenu from "@/components/layout/ProfileMenu";
import {
  isMarketplaceNavItemActive,
  MARKETPLACE_NAV_LINKS,
  requiresAuthPrompt,
  resolveMarketplaceNavHref,
} from "@/components/layout/marketplace-navigation";
import { NotificationBell } from "@/features/notifications/ui/NotificationBell";

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type CustomerNavbarProfile = {
  full_name?: string | null;
  avatar_url?: string | null;
  isVenueOwner?: boolean;
  isSupplier?: boolean;
};

type NavLink = {
  label: string;
  href: string;
  icon?: typeof Search;
  mobileOnly?: boolean;
};

const primaryNavLinks = MARKETPLACE_NAV_LINKS;

const mobileNavLinks: NavLink[] = [
  { label: "Browse", href: "/venues", icon: Search, mobileOnly: true },
  { label: "Suppliers", href: "/suppliers", icon: Store, mobileOnly: true },
  {
    label: "Bookings",
    href: "/bookings",
    icon: CalendarDays,
    mobileOnly: true,
  },
  { label: "Favorites", href: "/favorites", icon: Heart, mobileOnly: true },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    mobileOnly: true,
  },
];

export function CustomerNavbar({
  user,
  profile,
  variant = "full",
}: {
  user?: { email?: string | null } | null;
  profile?: CustomerNavbarProfile | null;
  variant?: "full" | "subnav";
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState("/bookings");

  const closeMenu = () => setMenuOpen(false);

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Venora User";
  const email = user?.email ?? "";
  const isAuthenticated = Boolean(user);

  const handleGatedNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (isAuthenticated || !requiresAuthPrompt(href)) return;
    event.preventDefault();
    setAuthRedirectTo(href);
    setAuthPromptOpen(true);
    closeMenu();
  };

  const authPrompt = (
    <AuthRequiredPrompt
      open={authPromptOpen}
      onOpenChange={setAuthPromptOpen}
      redirectTo={authRedirectTo}
    />
  );

  if (variant === "subnav") {
    return (
      <>
        <header className="shrink-0 border-b border-[#E5E7EB]/80 bg-white/95 backdrop-blur-xl">
          <nav
            aria-label="Marketplace navigation"
            className="mx-auto flex w-full max-w-[1600px] overflow-x-auto px-2 sm:px-4 lg:px-8"
          >
            {primaryNavLinks.map((item) => {
              const active = isMarketplaceNavItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={resolveMarketplaceNavHref(item.href, isAuthenticated)}
                  onClick={(event) => handleGatedNavClick(event, item.href)}
                  className={[
                    "inline-flex min-w-[5.5rem] flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-center text-sm font-bold transition sm:px-4 sm:py-3.5",
                    active
                      ? "border-[#2563EB] bg-[#EFF6FF]/60 text-[#1D4ED8]"
                      : "border-transparent text-[#6B7280] hover:border-[#BFDBFE] hover:bg-[#F8FAFC] hover:text-[#2563EB]",
                  ].join(" ")}
                >
                  {item.icon ? <item.icon className="h-4 w-4" /> : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {authPrompt}
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 shrink-0 border-b border-[#E5E7EB]/80 bg-white/85 backdrop-blur-xl">
        {menuOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close menu"
            onClick={closeMenu}
          />
        ) : null}

        <div className="relative mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/venues"
            className="text-lg font-bold tracking-[-0.03em] text-[#2563EB] transition hover:text-[#1D4ED8] sm:text-xl"
            onClick={closeMenu}
          >
            Venora
          </Link>

          <nav
            aria-label="Primary navigation"
            className="absolute left-1/2 hidden -translate-x-1/2 justify-center md:flex"
          >
            <div className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB]/90 bg-white/90 p-1">
              {primaryNavLinks.map((item) => {
                const active = isMarketplaceNavItemActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={resolveMarketplaceNavHref(item.href, isAuthenticated)}
                    onClick={(event) => handleGatedNavClick(event, item.href)}
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
                      active
                        ? "bg-[#EFF6FF] text-[#1D4ED8] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)] hover:text-[#1D4ED8]"
                        : "text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#2563EB]",
                    ].join(" ")}
                  >
                    {item.icon ? <item.icon className="h-4 w-4" /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
            {user ? <NotificationBell className="hidden lg:inline-flex" /> : null}

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] sm:inline-flex"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {user ? (
              <div className="hidden md:block">
                <ProfileMenu
                  displayName={displayName}
                  email={email}
                  avatarUrl={profile?.avatar_url}
                  showEnterVenueDashboard={profile?.isVenueOwner}
                  showEnterSupplierDashboard={profile?.isSupplier}
                />
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden h-10 items-center justify-center rounded-full bg-[#2563EB] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8] md:inline-flex"
              >
                Log In
              </Link>
            )}

            <div className="relative z-50 md:hidden">
              <button
                type="button"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1D4ED8] transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
              >
                {menuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  aria-label="Customer navigation"
                  className="fixed inset-x-3 top-20 z-[60] max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-[28px] border border-[#E5E7EB] bg-white p-3 shadow-2xl shadow-slate-300/50"
                >
                  <div className="grid gap-1">
                    {mobileNavLinks
                      .filter(
                        (item) =>
                          isAuthenticated || item.href !== "/notifications",
                      )
                      .map((item) => {
                        const Icon = item.icon ?? Search;
                        const active = isMarketplaceNavItemActive(
                          pathname,
                          item.href,
                        );
                        const itemClassName = [
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition",
                          active
                            ? "bg-[#EFF6FF] text-[#2563EB]"
                            : "text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]",
                        ].join(" ");

                        return (
                          <Link
                            key={item.href}
                            href={resolveMarketplaceNavHref(
                              item.href,
                              isAuthenticated,
                            )}
                            role="menuitem"
                            onClick={(event) => {
                              handleGatedNavClick(event, item.href);
                              if (
                                isAuthenticated ||
                                !requiresAuthPrompt(item.href)
                              ) {
                                closeMenu();
                              }
                            }}
                            className={itemClassName}
                          >
                            <Icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        );
                      })}

                    {user ? (
                      <>
                        {profile?.isVenueOwner ? (
                          <Link
                            href="/dashboard/venue-owner"
                            role="menuitem"
                            onClick={closeMenu}
                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#1D4ED8] bg-[#EFF6FF] transition hover:bg-[#DBEAFE]"
                          >
                            <Store className="h-5 w-5" />
                            Enter Venue Owner Dashboard
                          </Link>
                        ) : null}

                        {profile?.isSupplier ? (
                          <Link
                            href="/dashboard/supplier"
                            role="menuitem"
                            onClick={closeMenu}
                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#1D4ED8] bg-[#EFF6FF] transition hover:bg-[#DBEAFE]"
                          >
                            <Store className="h-5 w-5" />
                            Enter Supplier Dashboard
                          </Link>
                        ) : null}

                        <Link
                          href="/account"
                          role="menuitem"
                          onClick={closeMenu}
                          className={[
                            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition",
                            isRouteActive(pathname, "/account")
                              ? "bg-[#EFF6FF] text-[#2563EB]"
                              : "text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]",
                          ].join(" ")}
                        >
                          <UserRound className="h-5 w-5" />
                          Account
                        </Link>

                        <Link
                          href="/logout"
                          role="menuitem"
                          onClick={closeMenu}
                          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#6B7280] transition hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                        >
                          <LogOut className="h-5 w-5" />
                          Logout
                        </Link>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        role="menuitem"
                        onClick={closeMenu}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#2563EB] transition hover:bg-[#EFF6FF]"
                      >
                        Sign In
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      {authPrompt}
    </>
  );
}
