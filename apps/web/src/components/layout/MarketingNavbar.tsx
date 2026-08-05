"use client";

import { useCallback, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  Bell,
  CalendarDays,
  Heart,
  Home,
  Info,
  LogOut,
  Menu,
  Search,
  Store,
  ClipboardCheck,
  UserRound,
  X,
} from "lucide-react";
import { AuthRequiredPrompt } from "@/components/layout/AuthRequiredPrompt";
import ProfileMenu from "@/components/layout/ProfileMenu";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  isMarketplaceNavItemActive,
  isMarketplaceParentActive,
  requiresAuthPrompt,
  resolveMarketplaceNavHref,
} from "@/components/layout/marketplace-navigation";
import { NotificationBell } from "@/features/notifications/ui/NotificationBell";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

interface MarketingNavbarProfile {
  full_name?: string | null;
  avatar_url?: string | null;
  isVenueOwner?: boolean;
  isSupplier?: boolean;
  isCoordinator?: boolean;
  isAdmin?: boolean;
}

const HOST_VENUE_PATH = "/account/become-partner";

type MobileLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
  authOnly?: boolean;
};

const marketingNavLinks: MobileLink[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Browse", href: "/venues", icon: Search },
  { label: "About", href: "/about", icon: Info },
];

const marketplaceMobileLinks: MobileLink[] = [
  { label: "Venues", href: "/venues", icon: Home },
  { label: "Suppliers", href: "/suppliers", icon: Store },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Favorites", href: "/favorites", icon: Heart },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    authOnly: true,
  },
];

function getMarketingNavLinks(): MobileLink[] {
  return [
    ...marketingNavLinks,
    {
      label: "Host a Venue",
      href: HOST_VENUE_PATH,
      icon: Store,
    },
  ];
}

export function getMarketingMobileLinks({
  user,
  mobileContext,
}: {
  user?: { email?: string | null } | null;
  mobileContext?: "marketing" | "marketplace";
}): MobileLink[] {
  if (mobileContext === "marketplace") {
    return marketplaceMobileLinks.filter((item) => user || !item.authOnly);
  }

  return getMarketingNavLinks();
}

export function resolveMarketingMobileHref({
  href,
  isAuthenticated,
  mobileContext,
}: {
  href: string;
  isAuthenticated: boolean;
  mobileContext?: "marketing" | "marketplace";
}) {
  if (mobileContext === "marketplace") {
    if (href === "/notifications" && !isAuthenticated) {
      const params = new URLSearchParams({
        redirectTo: href,
        prompt: "notifications",
      });

      return `/login?${params.toString()}`;
    }

    return resolveMarketplaceNavHref(href, isAuthenticated);
  }

  return href;
}

function isActive(pathname: string, href: string, label?: string) {
  if (label === "Host a Venue") {
    return (
      pathname === HOST_VENUE_PATH || pathname.startsWith(`${HOST_VENUE_PATH}/`)
    );
  }
  if (href === "/") return pathname === "/";
  if (href === "/venues") {
    return isMarketplaceParentActive(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Public landing-page navbar. Unlike CustomerNavbar (used inside the
 * marketplace shell), this renders on "/" for both signed-in and anonymous
 * visitors, so it needs its own Log In/Sign Up <-> profile-menu switch.
 *
 * Auth state is fetched client-side (useCurrentUser) rather than passed in
 * as server-fetched props: the marketing/info pages this renders on have no
 * other reason to be dynamic, and a per-request cookies()-based auth fetch
 * was the only thing forcing all of them off static generation. Signed-in
 * visitors briefly see the logged-out state until the client fetch
 * resolves — an acceptable tradeoff since these are primarily
 * logged-out-visitor pages.
 */
export default function MarketingNavbar({
  embedded = false,
  mobileContext = "marketing",
  variant = "default",
  scrolled = false,
}: {
  embedded?: boolean;
  mobileContext?: "marketing" | "marketplace";
  variant?: "default" | "immersive";
  scrolled?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState(HOST_VENUE_PATH);
  const { user: currentUser } = useCurrentUser();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const { containerRef, triggerRef } = useFocusTrap(menuOpen, closeMenu);

  const user = currentUser ? { email: currentUser.email } : null;
  const profile: MarketingNavbarProfile | null = currentUser
    ? {
        full_name: currentUser.fullName,
        avatar_url: currentUser.avatarUrl,
        isVenueOwner: currentUser.roles.includes("venue_owner"),
        isSupplier: currentUser.roles.includes("supplier"),
        isCoordinator: currentUser.roles.includes("event_coordinator"),
        isAdmin: currentUser.roles.includes("admin"),
      }
    : null;

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Venora User";
  const email = user?.email ?? "";
  const isAuthenticated = Boolean(user);
  const immersive = variant === "immersive";

  const navLinksForUser = getMarketingNavLinks();
  const mobileLinks = getMarketingMobileLinks({ user, mobileContext });
  const mobilePanelPosition = immersive
    ? "top-20 max-h-[calc(100dvh-5.5rem)]"
    : embedded
      ? "top-[8.75rem] max-h-[calc(100dvh-9.25rem)]"
      : "top-24 max-h-[calc(100dvh-6.5rem)]";

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

  return (
    <>
      <header
        data-navbar-appearance={variant}
        data-navbar-state={
          immersive ? (scrolled ? "scrolled" : "top") : undefined
        }
        className={[
          "w-full border-b transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none",
          immersive
            ? scrolled
              ? "border-white/[0.18] bg-[#07100D]/[0.55] shadow-[0_8px_24px_rgba(0,0,0,0.16)] supports-[backdrop-filter]:bg-[#07100D]/[0.36] supports-[backdrop-filter]:backdrop-blur-[22px] supports-[backdrop-filter]:backdrop-saturate-150"
              : "border-white/[0.18] bg-[#07100D]/[0.30] supports-[backdrop-filter]:bg-white/[0.08] supports-[backdrop-filter]:backdrop-blur-[22px] supports-[backdrop-filter]:backdrop-saturate-150"
            : [
                "bg-white/90 backdrop-blur-xl",
                embedded
                  ? "border-[#E5E7EB]/60"
                  : "sticky top-0 z-50 border-[#E5E7EB]/80",
              ].join(" "),
        ].join(" ")}
      >
        <div className="mx-auto grid h-20 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-5 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr] lg:px-8">
          <Link
            className={[
              "justify-self-start text-xl font-bold tracking-[-0.04em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
              immersive
                ? "text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.28)] hover:text-[#F5D99D] focus-visible:outline-[#F5D99D]"
                : "text-[#2563EB] hover:text-[#1d4ed8] focus-visible:outline-[#2563EB]",
            ].join(" ")}
            href="/"
            aria-label="Venora home"
          >
            Venora
          </Link>

          <nav
            className={[
              "hidden items-center justify-center gap-1 md:flex",
              immersive
                ? "h-full self-stretch"
                : "rounded-full border border-[#E5E7EB]/80 bg-white p-1 shadow-sm",
            ].join(" ")}
            aria-label="Main navigation"
          >
            {navLinksForUser.map(({ label, href, icon: Icon }) => {
              const active = isActive(pathname, href, label);

              return (
                <Link
                  key={label}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "inline-flex items-center gap-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2",
                    immersive
                      ? [
                          "h-full border-b-2 px-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.24)] focus-visible:outline-[#F5D99D] focus-visible:outline-offset-[-4px]",
                          active
                            ? "border-[#D1AA62] text-[#F5D99D]"
                            : "border-transparent text-white/80 hover:border-white/35 hover:text-white",
                        ].join(" ")
                      : [
                          "rounded-full px-4 py-2",
                          active
                            ? "bg-[#EFF6FF] font-extrabold text-[#2563EB]"
                            : "text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
                        ].join(" "),
                  ].join(" ")}
                  href={href}
                  onClick={(event) => handleGatedNavClick(event, href)}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center justify-end gap-3 justify-self-end md:flex">
            {user && !menuOpen ? (
              <>
                <NotificationBell
                  {...(immersive
                    ? {
                        className:
                          "border-white/20 text-white/80 hover:border-white/35 hover:bg-white/10 hover:text-white focus-visible:ring-[#F5D99D]/60",
                      }
                    : {})}
                />
                <div
                  className={
                    immersive
                      ? "[&_button]:border-white/25 [&_button]:bg-white/10 [&_button]:text-white [&_button]:shadow-none"
                      : undefined
                  }
                >
                  <ProfileMenu
                    displayName={displayName}
                    email={email}
                    avatarUrl={profile?.avatar_url}
                    showEnterAdminDashboard={profile?.isAdmin ?? false}
                    showEnterVenueDashboard={profile?.isVenueOwner ?? false}
                    showEnterCoordinatorDashboard={
                      profile?.isCoordinator ?? false
                    }
                    showEnterSupplierDashboard={profile?.isSupplier ?? false}
                  />
                </div>
              </>
            ) : (
              <>
                <Link
                  className={[
                    "text-sm font-extrabold transition",
                    immersive
                      ? "text-white/85 hover:text-white"
                      : "text-[#6B7280] hover:text-[#2563EB]",
                  ].join(" ")}
                  href="/login"
                >
                  Log In
                </Link>
                <Link
                  className={[
                    "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-extrabold transition",
                    immersive
                      ? "border border-white/20 bg-[#F4E8CF] text-[#152019] hover:bg-white"
                      : "bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/20 hover:bg-[#1d4ed8]",
                  ].join(" ")}
                  href="/register"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center justify-self-end gap-2 md:hidden">
            {user ? (
              <>
                <NotificationBell
                  {...(immersive
                    ? {
                        className:
                          "border-white/20 text-white/80 hover:border-white/35 hover:bg-white/10 hover:text-white",
                      }
                    : {})}
                />
                <div
                  className={
                    immersive
                      ? "[&_button]:border-white/25 [&_button]:bg-white/10 [&_button]:text-white"
                      : undefined
                  }
                >
                  <ProfileMenu
                    displayName={displayName}
                    email={email}
                    avatarUrl={profile?.avatar_url}
                    showEnterAdminDashboard={profile?.isAdmin ?? false}
                    showEnterVenueDashboard={profile?.isVenueOwner ?? false}
                    showEnterCoordinatorDashboard={
                      profile?.isCoordinator ?? false
                    }
                    showEnterSupplierDashboard={profile?.isSupplier ?? false}
                  />
                </div>
              </>
            ) : null}

            <button
              ref={triggerRef}
              className={[
                "inline-flex h-11 w-11 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                immersive
                  ? "border-white/25 bg-black/20 text-white hover:bg-white/10 focus-visible:outline-[#F5D99D]"
                  : "border-[#E5E7EB] bg-white text-[#1D4ED8] hover:bg-[#EFF6FF] focus-visible:outline-[#2563EB]",
              ].join(" ")}
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div
            ref={containerRef}
            className="fixed inset-0 z-[60] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <button
              type="button"
              tabIndex={-1}
              className="absolute inset-0 bg-slate-950/35"
              aria-label="Close menu"
              onClick={closeMenu}
            />
            <div
              className={[
                "fixed inset-x-3 z-[61] overflow-y-auto rounded-2xl border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl",
                immersive
                  ? "border-white/10 bg-[#07100D] shadow-black/40"
                  : "border-[#E5E7EB] bg-white shadow-slate-300/50",
                mobilePanelPosition,
              ].join(" ")}
            >
              <button
                className={[
                  "absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full",
                  immersive
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-[#F8FAFC] text-[#111827]",
                ].join(" ")}
                type="button"
                aria-label="Close menu"
                onClick={closeMenu}
              >
                <X className="h-5 w-5" />
              </button>

              <p
                className={[
                  "mb-5 text-xl font-bold tracking-[-0.04em]",
                  immersive ? "text-white" : "text-[#2563EB]",
                ].join(" ")}
              >
                Venora
              </p>

              <nav aria-label="Mobile Navigation" className="grid gap-2">
                {mobileLinks.map(({ label, href, icon: Icon }) => {
                  const active =
                    mobileContext === "marketplace"
                      ? isMarketplaceNavItemActive(pathname, href)
                      : isActive(pathname, href, label);

                  return (
                    <Link
                      key={label}
                      href={resolveMarketingMobileHref({
                        href,
                        isAuthenticated,
                        mobileContext,
                      })}
                      className={[
                        "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold transition",
                        immersive
                          ? active
                            ? "bg-white/12 text-[#F5D99D]"
                            : "text-white/85 hover:bg-white/10 hover:text-white"
                          : active
                            ? "bg-[#EFF6FF] text-[#2563EB]"
                            : "text-[#111827] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
                      ].join(" ")}
                      onClick={(event) => {
                        handleGatedNavClick(event, href);
                        if (isAuthenticated || !requiresAuthPrompt(href)) {
                          closeMenu();
                        }
                      }}
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : null}
                      {label}
                    </Link>
                  );
                })}
              </nav>

              {user ? (
                <div className="mt-3 grid gap-2">
                  {profile?.isVenueOwner ? (
                    <Link
                      href="/dashboard/venue-owner"
                      className={[
                        "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold transition",
                        immersive
                          ? "bg-white/10 text-[#F5D99D] hover:bg-white/15"
                          : "bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]",
                      ].join(" ")}
                      onClick={closeMenu}
                    >
                      <Store className="h-5 w-5" />
                      Enter Venue Owner Dashboard
                    </Link>
                  ) : null}
                  {profile?.isCoordinator ? (
                    <Link
                      href="/dashboard/coordinator"
                      className={[
                        "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold transition",
                        immersive
                          ? "bg-white/10 text-[#F5D99D] hover:bg-white/15"
                          : "bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]",
                      ].join(" ")}
                      onClick={closeMenu}
                    >
                      <ClipboardCheck className="h-5 w-5" />
                      Enter Coordinator Dashboard
                    </Link>
                  ) : null}
                  {profile?.isSupplier ? (
                    <Link
                      href="/dashboard/supplier"
                      className={[
                        "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold transition",
                        immersive
                          ? "bg-white/10 text-[#F5D99D] hover:bg-white/15"
                          : "bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]",
                      ].join(" ")}
                      onClick={closeMenu}
                    >
                      <Store className="h-5 w-5" />
                      Enter Supplier Dashboard
                    </Link>
                  ) : null}
                  <Link
                    href="/account"
                    className={[
                      "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold transition",
                      immersive
                        ? "text-white/85 hover:bg-white/10 hover:text-white"
                        : "text-[#111827] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
                    ].join(" ")}
                    onClick={closeMenu}
                  >
                    <UserRound className="h-5 w-5" />
                    Account
                  </Link>
                  <Link
                    href="/logout"
                    className={[
                      "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold transition",
                      immersive
                        ? "text-red-200 hover:bg-red-500/10 hover:text-red-100"
                        : "text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#DC2626]",
                    ].join(" ")}
                    onClick={closeMenu}
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </Link>
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  <Link
                    href="/login"
                    className={[
                      "inline-flex h-12 items-center justify-center rounded-xl border text-sm font-extrabold",
                      immersive
                        ? "border-white/20 text-white hover:bg-white/10"
                        : "border-[#E5E7EB] text-[#1D4ED8]",
                    ].join(" ")}
                    onClick={closeMenu}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className={[
                      "inline-flex h-12 items-center justify-center rounded-xl text-sm font-extrabold",
                      immersive
                        ? "bg-[#F4E8CF] text-[#152019] hover:bg-white"
                        : "bg-[#2563EB] text-white",
                    ].join(" ")}
                    onClick={closeMenu}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <AuthRequiredPrompt
        open={authPromptOpen}
        onOpenChange={setAuthPromptOpen}
        redirectTo={authRedirectTo}
      />
    </>
  );
}
