"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@venora/lib";
import ProfileMenu from "@/components/layout/ProfileMenu";
import { NotificationBell } from "@/features/notifications/ui/NotificationBell";
import { MaterialIcon } from "./MaterialIcon";
import {
  NAV_BY_ROLE,
  ROLE_LABELS,
  type EnterpriseRole,
  type NavItem,
} from "./nav-config";

type EnterpriseShellProps = {
  role: EnterpriseRole;
  children: ReactNode;
  userName?: string;
  userEmail?: string;
  userSubtitle?: string;
  userAvatar?: string;
  businessName?: string;
};

function matchesRoute(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/admin") return pathname === "/admin";
  if (href === "/dashboard/coordinator")
    return pathname === "/dashboard/coordinator";
  if (href === "/dashboard/supplier") return pathname === "/dashboard/supplier";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  isActive,
  uppercase,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  uppercase?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
        uppercase && "uppercase tracking-wide text-xs",
        isActive
          ? "bg-white text-[#1d4ed8] shadow-sm ring-1 ring-[#dbeafe]"
          : "text-[#475569] hover:bg-white/80 hover:text-[#1d4ed8]",
      )}
    >
      {isActive ? (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#1d4ed8]" />
      ) : null}
      <MaterialIcon
        name={item.icon}
        className={cn(
          "text-xl transition",
          isActive
            ? "text-[#1d4ed8]"
            : "text-[#94a3b8] group-hover:text-[#1d4ed8]",
        )}
        filled={isActive}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-[#1d4ed8] px-2 py-0.5 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function Sidebar({
  role,
  pathname,
  onNavigate,
}: {
  role: EnterpriseRole;
  pathname: string;
  onNavigate?: () => void;
}) {
  const items = NAV_BY_ROLE[role];
  // Some roles currently share a single destination page across multiple nav
  // entries; only the first matching item should render as "active" so the
  // sidebar always highlights exactly one button, like every other role.
  const activeIndex = items.findIndex((item) =>
    matchesRoute(item.href, pathname),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-[22px] border border-[#dbeafe] bg-white p-3 shadow-sm shadow-slate-200/60"
          {...(onNavigate ? { onClick: onNavigate } : {})}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#dbeafe]">
            <MaterialIcon name="domain" className="text-xl" filled />
          </div>
          <div>
            <p className="font-display text-lg font-black tracking-tight text-[#0f172a]">
              Venora
            </p>
            <p className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {items.map((item, index) => (
          <NavLink
            key={item.label}
            item={item}
            isActive={index === activeIndex}
            uppercase
            {...(onNavigate ? { onNavigate } : {})}
          />
        ))}
      </nav>

      <div className="mt-6 border-t border-[#dbe3ef] pt-4">
        {role === "supplier" ? (
          <Link
            href="/suppliers"
            {...(onNavigate ? { onClick: onNavigate } : {})}
            className="mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-white hover:text-[#1d4ed8]"
          >
            <MaterialIcon name="storefront" className="text-xl" />
            Browse Marketplace
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            window.location.href = "/logout";
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <MaterialIcon name="logout" className="text-xl" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function TopBar({
  role,
  userName,
  userEmail,
  userSubtitle,
  userAvatar,
  businessName,
  onMenuClick,
}: {
  role: EnterpriseRole;
  userName?: string;
  userEmail?: string;
  userSubtitle?: string;
  userAvatar?: string;
  businessName?: string;
  onMenuClick?: () => void;
}) {
  const displayName = userName ?? "Account User";
  const subtitle = userSubtitle ?? businessName ?? ROLE_LABELS[role];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white/90 px-4 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dbe3ef] bg-white text-[#475569] shadow-sm hover:bg-[#eff6ff]"
        aria-label="Open menu"
      >
        <MaterialIcon name="menu" className="text-2xl" />
      </button>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="text-right">
          <p className="text-sm font-bold text-[#0f172a]">{displayName}</p>
          <p className="text-xs text-[#64748b]">{subtitle}</p>
        </div>
        <ProfileMenu
          displayName={displayName}
          email={userEmail ?? ""}
          avatarUrl={userAvatar}
          showExitDashboard
        />
      </div>
    </header>
  );
}

function DesktopTopBar({
  role,
  userName,
  userEmail,
  userSubtitle,
  userAvatar,
  businessName,
}: {
  role: EnterpriseRole;
  userName?: string;
  userEmail?: string;
  userSubtitle?: string;
  userAvatar?: string;
  businessName?: string;
}) {
  const displayName = userName ?? "Account User";

  return (
    <div className="sticky top-0 z-30 hidden items-center justify-between border-b border-[#e5e7eb] bg-white/90 px-6 py-4 backdrop-blur lg:flex">
      <div>
        <p className="inline-flex rounded-full border border-[#dbeafe] bg-[#eff6ff] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#1d4ed8]">
          {ROLE_LABELS[role]}
        </p>
        {businessName ? (
          <p className="mt-2 font-display text-lg font-black tracking-tight text-[#0f172a]">
            {businessName}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="text-right">
          <p className="text-sm font-bold text-[#0f172a]">{displayName}</p>
          {userSubtitle ? (
            <p className="text-xs text-[#64748b]">{userSubtitle}</p>
          ) : null}
        </div>
        <ProfileMenu
          displayName={displayName}
          email={userEmail ?? ""}
          avatarUrl={userAvatar}
          showExitDashboard
        />
      </div>
    </div>
  );
}

export function EnterpriseShell({
  role,
  children,
  userName,
  userEmail,
  userSubtitle,
  userAvatar,
  businessName,
}: EnterpriseShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-[#f8fbff]">
      {/* Desktop sidebar - sticks in place while the page scrolls */}
      <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 overflow-y-auto border-r border-[#dbe3ef] bg-[#eef6ff] p-5 lg:block">
        <Sidebar role={role} pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[288px] overflow-y-auto bg-[#eef6ff] p-5 shadow-xl">
            <Sidebar
              role={role}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          role={role}
          {...(userName ? { userName } : {})}
          {...(userEmail ? { userEmail } : {})}
          {...(userSubtitle ? { userSubtitle } : {})}
          {...(userAvatar ? { userAvatar } : {})}
          {...(businessName ? { businessName } : {})}
          onMenuClick={() => setMobileOpen(true)}
        />
        <DesktopTopBar
          role={role}
          {...(userName ? { userName } : {})}
          {...(userEmail ? { userEmail } : {})}
          {...(userSubtitle ? { userSubtitle } : {})}
          {...(userAvatar ? { userAvatar } : {})}
          {...(businessName ? { businessName } : {})}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
