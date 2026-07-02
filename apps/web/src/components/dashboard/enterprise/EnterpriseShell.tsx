"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@venora/lib";
import { MaterialIcon } from "./MaterialIcon";
import {
  NAV_BY_ROLE,
  ROLE_LABELS,
  SUPPLIER_PERFORMANCE_NAV,
  type EnterpriseRole,
  type NavItem,
} from "./nav-config";

type EnterpriseShellProps = {
  role: EnterpriseRole;
  children: ReactNode;
  userName?: string | undefined;
  userSubtitle?: string | undefined;
  userAvatar?: string | undefined;
  businessName?: string | undefined;
};

function NavLink({
  item,
  pathname,
  compact,
}: {
  item: NavItem;
  pathname: string;
  compact?: boolean;
}) {
  const isActive = (() => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    if (item.href === "/admin") return pathname === "/admin";
    if (item.href === "/dashboard/coordinator") return pathname === "/dashboard/coordinator";
    if (item.href === "/dashboard/supplier") return pathname === "/dashboard/supplier";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  })();

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        compact && "text-[13px]",
        isActive
          ? "bg-[#9a442d] text-white shadow-sm"
          : "text-[#5c647a] hover:bg-white/80 hover:text-[#191c1e]",
      )}
    >
      <MaterialIcon
        name={item.icon}
        className="shrink-0 text-[20px]"
        filled={isActive}
      />
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <span className="ml-auto rounded-full bg-[#e07a5f] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function Sidebar({
  role,
  pathname,
  className,
}: {
  role: EnterpriseRole;
  pathname: string;
  className?: string;
}) {
  const router = useRouter();
  const items = NAV_BY_ROLE[role];
  const isSupplier = role === "supplier";

  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col border-r border-[#e8deda] bg-[#fafbfc]",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {!isSupplier ? (
          <div className="mb-5 flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9a442d] text-white shadow-sm">
              <MaterialIcon
                name={role === "admin" ? "shield_person" : "domain"}
                className="text-[20px]"
                filled
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold leading-tight text-[#9a442d]">
                Venora
              </p>
              <p className="truncate text-xs text-[#565e74]">{ROLE_LABELS[role]}</p>
            </div>
          </div>
        ) : null}

        {isSupplier ? (
          <>
            <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#88726d]">
              Management
            </p>
            <nav className="mb-5 flex flex-col gap-0.5">
              {items.map((item) => (
                <NavLink key={item.label} item={item} pathname={pathname} compact />
              ))}
            </nav>
            <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#88726d]">
              Performance
            </p>
            <nav className="flex flex-col gap-0.5">
              {SUPPLIER_PERFORMANCE_NAV.map((item) => (
                <NavLink key={item.label} item={item} pathname={pathname} compact />
              ))}
            </nav>
          </>
        ) : (
          <nav className="flex flex-col gap-0.5">
            {items.map((item) => (
              <NavLink key={item.label} item={item} pathname={pathname} />
            ))}
          </nav>
        )}
      </div>

      <div className="shrink-0 space-y-0.5 border-t border-[#e8deda] p-4">
        {role === "coordinator" ? (
          <button
            type="button"
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#9a442d] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7c351f]"
          >
            <MaterialIcon name="add" className="text-[18px]" />
            Create Event
          </button>
        ) : null}
        <Link
          href="#"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#5c647a] transition hover:bg-white/80"
        >
          <MaterialIcon name="contact_support" className="text-[20px]" />
          Support
        </Link>
        <button
          type="button"
          onClick={() => router.push("/logout")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#5c647a] transition hover:bg-red-50 hover:text-[#ba1a1a]"
        >
          <MaterialIcon name="logout" className="text-[20px]" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function TopBar({
  role,
  userName,
  userSubtitle,
  userAvatar,
  businessName,
}: {
  role: EnterpriseRole;
  userName?: string | undefined;
  userSubtitle?: string | undefined;
  userAvatar?: string | undefined;
  businessName?: string | undefined;
}) {
  const searchPlaceholder =
    role === "admin"
      ? "Global platform search..."
      : "Search venues, bookings, or suppliers...";

  if (role === "supplier") {
    return (
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e8deda] bg-white px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-display text-2xl font-bold tracking-tight text-[#9a442d] sm:text-[1.65rem]">
            Venora
          </span>
          <div className="hidden h-5 w-px bg-[#e8deda] sm:block" />
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[#565e74] sm:block">
            Supplier Portal
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            className="relative rounded-xl p-2 text-[#565e74] transition hover:bg-[#f2f4f6] hover:text-[#9a442d]"
          >
            <MaterialIcon name="notifications" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ba1a1a]" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="max-w-[140px] truncate text-sm font-semibold">
                {businessName ?? "Supplier"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#565e74]">
                Pro Supplier
              </p>
            </div>
            <UserAvatar name={businessName ?? "S"} src={userAvatar} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#e8deda] bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <MaterialIcon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#88726d]"
        />
        <input
          type="search"
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-xl border border-transparent bg-[#f2f4f6] pl-10 pr-4 text-sm outline-none transition focus:border-[#9a442d]/20 focus:bg-white focus:ring-2 focus:ring-[#9a442d]/10"
        />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {role === "admin" ? (
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[#9a442d] transition hover:bg-[#fdf4f1] sm:flex"
          >
            <MaterialIcon name="sync_alt" className="text-[18px]" />
            Switch Role
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-xl p-2 text-[#565e74] transition hover:bg-[#f2f4f6] hover:text-[#9a442d]"
        >
          <MaterialIcon name="notifications" />
        </button>
        <button
          type="button"
          className="hidden rounded-xl p-2 text-[#565e74] transition hover:bg-[#f2f4f6] hover:text-[#9a442d] sm:block"
        >
          <MaterialIcon name="help" />
        </button>
        <div className="ml-1 flex items-center gap-2.5 border-l border-[#e8deda] pl-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight">{userName ?? "User"}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#565e74]">
              {userSubtitle ?? ROLE_LABELS[role]}
            </p>
          </div>
          <UserAvatar name={userName ?? "U"} src={userAvatar} />
        </div>
      </div>
    </header>
  );
}

function UserAvatar({ name, src }: { name: string; src?: string | undefined }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#e8deda] bg-[#dae2fd]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#505f76]">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
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
  const hasTopBar = role === "coordinator" || role === "admin" || role === "supplier";
  const isSupplier = role === "supplier";

  if (isSupplier) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f9fb] text-[#191c1e]">
        <TopBar role={role} businessName={businessName} userAvatar={userAvatar} />
        <div className="flex min-h-0 flex-1">
          <Sidebar
            role={role}
            pathname={pathname}
            className="sticky top-0 hidden h-[calc(100vh-4rem)] lg:flex"
          />
          <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f9fb] text-[#191c1e]">
      <Sidebar
        role={role}
        pathname={pathname}
        className="sticky top-0 hidden h-screen lg:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[#e8deda] bg-white px-4 lg:hidden">
          <span className="font-display text-lg font-bold text-[#9a442d]">Venora</span>
          <span className="text-xs text-[#565e74]">{ROLE_LABELS[role]}</span>
        </div>
        {hasTopBar ? (
          <TopBar
            role={role}
            userName={userName}
            userSubtitle={userSubtitle}
            userAvatar={userAvatar}
          />
        ) : null}
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
