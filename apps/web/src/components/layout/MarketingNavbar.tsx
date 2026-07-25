"use client";

import { useState, type MouseEvent } from "react";
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
  { label: "Notifications", href: "/notifications", icon: Bell, authOnly: true },
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
}: {
  embedded?: boolean;
  mobileContext?: "marketing" | "marketplace";
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState(HOST_VENUE_PATH);
  const { user: currentUser } = useCurrentUser();

  const user = currentUser ? { email: currentUser.email } : null;
  const profile: MarketingNavbarProfile | null = currentUser
    ? {
      full_name: currentUser.fullName,
      avatar_url: currentUser.avatarUrl,
      isVenueOwner: currentUser.roles.includes("venue_owner"),
      isSupplier: currentUser.roles.includes("supplier"),
      isCoordinator: currentUser.roles.includes("event_coordinator"),
    }
    : null;

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Venora User";
  const email = user?.email ?? "";
  const isAuthenticated = Boolean(user);

  const closeMenu = () => setMenuOpen(false);
  const navLinksForUser = getMarketingNavLinks();
  const mobileLinks = getMarketingMobileLinks({ user, mobileContext });
  const mobilePanelPosition = embedded
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
      className={[
        "w-full bg-white/90 backdrop-blur-xl",
        embedded
          ? "border-b border-[#E5E7EB]/60"
          : "sticky top-0 z-50 border-b border-[#E5E7EB]/80",
      ].join(" ")}
    >
      <div className="mx-auto grid h-20 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-5 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link
          className="justify-self-start text-xl font-bold tracking-[-0.04em] text-[#2563EB] transition hover:text-[#1d4ed8]"
          href="/"
        >
          Venora
        </Link>

        <nav
          className="hidden items-center justify-center gap-1 rounded-full border border-[#E5E7EB]/80 bg-white p-1 shadow-sm md:flex"
          aria-label="Main navigation"
        >
          {navLinksForUser.map(({ label, href, icon: Icon }) => {
            const active = isActive(pathname, href, label);

            return (
              <Link
                key={label}
                className={[
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
                  active
                    ? "bg-[#EFF6FF] text-[#2563EB] font-extrabold"
                    : "text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
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
              <NotificationBell />
              <ProfileMenu
                displayName={displayName}
                email={email}
                avatarUrl={profile?.avatar_url}
                showEnterVenueDashboard={profile?.isVenueOwner ?? false}
                showEnterCoordinatorDashboard={profile?.isCoordinator ?? false}
                showEnterSupplierDashboard={profile?.isSupplier ?? false}
              />
            </>
          ) : (
            <>
              <Link
                className="text-sm font-extrabold text-[#6B7280] transition hover:text-[#2563EB]"
                href="/login"
              >
                Log In
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
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
              <NotificationBell />
              <ProfileMenu
                displayName={displayName}
                email={email}
                avatarUrl={profile?.avatar_url}
                showEnterVenueDashboard={profile?.isVenueOwner ?? false}
                showEnterCoordinatorDashboard={profile?.isCoordinator ?? false}
                showEnterSupplierDashboard={profile?.isSupplier ?? false}
              />
            </>
          ) : null}

          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1D4ED8] transition hover:bg-[#EFF6FF]"
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
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/35 md:hidden"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            className={[
              "fixed inset-x-3 z-[60] overflow-y-auto rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-2xl shadow-slate-300/50 md:hidden",
              mobilePanelPosition,
            ].join(" ")}
            role="menu"
            aria-label="Mobile navigation"
          >
            <button
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F8FAFC] text-[#111827]"
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
            >
              <X className="h-5 w-5" />
            </button>

            <p className="mb-5 text-xl font-bold tracking-[-0.04em] text-[#2563EB]">
              Venora
            </p>

            <nav className="grid gap-2">
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
                    role="menuitem"
                    className={[
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition",
                      active
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
                    role="menuitem"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#1D4ED8] bg-[#EFF6FF] transition hover:bg-[#DBEAFE]"
                    onClick={closeMenu}
                  >
                    <Store className="h-5 w-5" />
                    Enter Venue Owner Dashboard
                  </Link>
                ) : null}
                {profile?.isCoordinator ? (
                  <Link
                    href="/dashboard/coordinator"
                    role="menuitem"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#1D4ED8] bg-[#EFF6FF] transition hover:bg-[#DBEAFE]"
                    onClick={closeMenu}
                  >
                    <ClipboardCheck className="h-5 w-5" />
                    Enter Coordinator Dashboard
                  </Link>
                ) : null}
                {profile?.isSupplier ? (
                  <Link
                    href="/dashboard/supplier"
                    role="menuitem"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#1D4ED8] bg-[#EFF6FF] transition hover:bg-[#DBEAFE]"
                    onClick={closeMenu}
                  >
                    <Store className="h-5 w-5" />
                    Enter Supplier Dashboard
                  </Link>
                ) : null}
                <Link
                  href="/account"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#111827] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                  onClick={closeMenu}
                >
                  <UserRound className="h-5 w-5" />
                  Account
                </Link>
                <Link
                  href="/logout"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-[#6B7280] transition hover:bg-[#FEF2F2] hover:text-[#DC2626]"
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
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] text-sm font-extrabold text-[#1D4ED8]"
                  onClick={closeMenu}
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-extrabold text-white"
                  onClick={closeMenu}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </>
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
