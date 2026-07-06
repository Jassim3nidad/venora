"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Heart,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";

const navLinks = [
  { label: "Browse", href: "/venues" },
  { label: "Bookings", href: "/bookings" },
  { label: "Favorites", href: "/favorites" },
];

const menuLinks = [
  { label: "Browse", href: "/venues", icon: Search, mobileOnly: true },
  {
    label: "Bookings",
    href: "/bookings",
    icon: CalendarDays,
    mobileOnly: true,
  },
  { label: "Favorites", href: "/favorites", icon: Heart, mobileOnly: true },
  { label: "Account", href: "/account", icon: UserRound },
  { label: "Logout", href: "/logout", icon: LogOut },
];

function isActive(pathname: string, href: string) {
  if (href === "/venues") {
    return pathname === "/venues" || pathname.startsWith("/venues/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CustomerNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
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
          className="text-lg font-black tracking-[-0.03em] text-[#2563EB] transition hover:text-[#1D4ED8] sm:text-xl"
          onClick={closeMenu}
        >
          Venora
        </Link>

        <nav
          aria-label="Primary navigation"
          className="absolute left-1/2 hidden -translate-x-1/2 justify-center md:flex"
        >
          <div className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB]/90 bg-white/90 p-1">
            {navLinks.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-bold transition",
                    active
                      ? "bg-[#EFF6FF] text-[#1D4ED8] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)] hover:text-[#1D4ED8]"
                      : "text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#2563EB]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] lg:inline-flex"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] sm:inline-flex"
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          <div className="relative z-50">
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
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-[26px] border border-[#E5E7EB] bg-white p-3 shadow-lg shadow-slate-200/70"
              >
                <div className="grid gap-1">
                  {menuLinks.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href !== "/logout" && isActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={closeMenu}
                        className={[
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition",
                          item.mobileOnly ? "md:hidden" : "",
                          active
                            ? "bg-[#EFF6FF] text-[#2563EB]"
                            : item.href === "/account"
                              ? "text-[#111827] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                              : "text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]",
                        ].join(" ")}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
