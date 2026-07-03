"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@venora/lib";
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
  userSubtitle?: string;
  userAvatar?: string;
  businessName?: string;
};

function NavLink({
  item,
  pathname,
  uppercase,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  uppercase?: boolean;
  onNavigate?: () => void;
}) {
  const isActive = (() => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    if (item.href === "/admin") return pathname === "/admin";
    if (item.href === "/dashboard/coordinator")
      return pathname === "/dashboard/coordinator";
    if (item.href === "/dashboard/supplier")
      return pathname === "/dashboard/supplier";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  })();

  return (
    <Link
      href={item.href}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
        uppercase && "uppercase tracking-wide text-xs",
        isActive
          ? "bg-[#fff4f0] text-[#9a442d]"
          : "text-[#55423e] hover:bg-[#fff4f0] hover:text-[#9a442d]",
      )}
    >
      <MaterialIcon
        name={item.icon}
        className="text-xl"
        filled={isActive}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-[#9a442d] px-2 py-0.5 text-[10px] font-bold text-white">
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
  const isAdmin = role === "admin";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 px-1">
        <Link href="/" className="flex items-center gap-3" {...(onNavigate ? { onClick: onNavigate } : {})}>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isAdmin ? "bg-[#191c1e] text-white" : "bg-[#fff4f0] text-[#9a442d]",
            )}
          >
            <MaterialIcon name="domain" className="text-xl" filled />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-[#191c1e]">
              Venora
            </p>
            <p className="text-xs font-medium text-[#88726d]">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            pathname={pathname}
            uppercase
            {...(onNavigate ? { onNavigate } : {})}
          />
        ))}
      </nav>

      <div className="mt-6 border-t border-[#e8deda] pt-4">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            window.location.href = "/logout";
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
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
  userSubtitle,
  userAvatar,
  businessName,
  onMenuClick,
}: {
  role: EnterpriseRole;
  userName?: string;
  userSubtitle?: string;
  userAvatar?: string;
  businessName?: string;
  onMenuClick?: () => void;
}) {
  const displayName = userName ?? "Account User";
  const subtitle =
    userSubtitle ?? businessName ?? ROLE_LABELS[role];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e8deda] bg-white px-4 lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-[#55423e] hover:bg-[#fff4f0]"
        aria-label="Open menu"
      >
        <MaterialIcon name="menu" className="text-2xl" />
      </button>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-bold text-[#191c1e]">{displayName}</p>
          <p className="text-xs text-[#88726d]">{subtitle}</p>
        </div>
        {userAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userAvatar}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-2 ring-[#e8deda]"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4f0] text-sm font-bold text-[#9a442d]">
            {displayName.charAt(0)}
          </div>
        )}
      </div>
    </header>
  );
}

function DesktopTopBar({
  role,
  userName,
  userSubtitle,
  businessName,
}: {
  role: EnterpriseRole;
  userName?: string;
  userSubtitle?: string;
  businessName?: string;
}) {
  const displayName = userName ?? "Account User";

  return (
    <div className="hidden items-center justify-between border-b border-[#e8deda] bg-white px-6 py-4 lg:flex">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#88726d]">
          {ROLE_LABELS[role]}
        </p>
        {businessName ? (
          <p className="font-display text-lg font-bold text-[#191c1e]">
            {businessName}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-bold text-[#191c1e]">{displayName}</p>
          {userSubtitle ? (
            <p className="text-xs text-[#88726d]">{userSubtitle}</p>
          ) : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff4f0] text-sm font-bold text-[#9a442d]">
          {displayName.charAt(0)}
        </div>
      </div>
    </div>
  );
}

export function EnterpriseShell({
  role,
  children,
  userName,
  userSubtitle,
  userAvatar,
  businessName,
}: EnterpriseShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = role === "admin";

  return (
    <div className="flex min-h-dvh bg-[#fffdfc]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden w-[260px] shrink-0 border-r border-[#e8deda] p-5 lg:block",
          isAdmin ? "bg-[#191c1e]" : "bg-white",
        )}
      >
        <div className={isAdmin ? "[&_*]:text-white [&_.text-\\[\\#88726d\\]]:text-gray-400 [&_.text-\\[\\#55423e\\]]:text-gray-300 [&_.text-\\[\\#191c1e\\]]:text-white [&_.hover\\:bg-\\[\\#fff4f0\\]:hover]:bg-white/10 [&_.bg-\\[\\#fff4f0\\]]:bg-white/15 [&_.text-\\[\\#9a442d\\]]:text-[#e07a5f]" : ""}>
          <Sidebar role={role} pathname={pathname} />
        </div>
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
          <aside className="relative h-full w-[280px] bg-white p-5 shadow-xl">
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
          {...(userSubtitle ? { userSubtitle } : {})}
          {...(userAvatar ? { userAvatar } : {})}
          {...(businessName ? { businessName } : {})}
          onMenuClick={() => setMobileOpen(true)}
        />
        <DesktopTopBar
          role={role}
          {...(userName ? { userName } : {})}
          {...(userSubtitle ? { userSubtitle } : {})}
          {...(businessName ? { businessName } : {})}
        />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
