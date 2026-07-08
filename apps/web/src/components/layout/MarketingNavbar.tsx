"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import ProfileMenu from "@/components/layout/ProfileMenu";

interface MarketingNavbarProfile {
  full_name?: string | null;
  avatar_url?: string | null;
}

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Venues", href: "/venues" },
  { label: "About", href: "/about" },
  { label: "Host a Venue", href: "/register" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Public landing-page navbar. Unlike CustomerNavbar (used inside the
 * marketplace shell), this renders on "/" for both signed-in and anonymous
 * visitors, so it needs its own Log In/Sign Up <-> profile-menu switch.
 */
export default function MarketingNavbar({
  user,
  profile,
  embedded = false,
}: {
  user?: { email?: string | null } | null;
  profile?: MarketingNavbarProfile | null;
  embedded?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Venora User";
  const email = user?.email ?? "";

  const closeMenu = () => setMenuOpen(false);

  return (
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
          className="justify-self-start text-xl font-black tracking-[-0.04em] text-[#2563EB] transition hover:text-[#1d4ed8]"
          href="/"
        >
          Venora
        </Link>

        <nav
          className="hidden items-center justify-center gap-1 rounded-full border border-[#E5E7EB]/80 bg-white p-1 shadow-sm md:flex"
          aria-label="Main navigation"
        >
          {navLinks.map(({ label, href }) => {
            const active = isActive(pathname, href);

            return (
              <Link
                key={label}
                className={[
                  "rounded-full px-4 py-2 text-sm font-bold transition",
                  active
                    ? "bg-[#EFF6FF] text-[#2563EB] font-extrabold"
                    : "text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
                ].join(" ")}
                href={href}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center justify-end gap-3 justify-self-end md:flex">
          {user ? (
            <ProfileMenu
              displayName={displayName}
              email={email}
              avatarUrl={profile?.avatar_url}
            />
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
            <ProfileMenu
              displayName={displayName}
              email={email}
              avatarUrl={profile?.avatar_url}
            />
          ) : null}

          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1D4ED8] transition hover:bg-[#EFF6FF]"
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
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
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border border-[#E5E7EB] bg-white px-4 pb-6 pt-5 shadow-2xl md:hidden"
            role="dialog"
            aria-modal="true"
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

            <p className="mb-5 text-xl font-black tracking-[-0.04em] text-[#2563EB]">
              Venora
            </p>

            <nav className="grid gap-2">
              {navLinks.map(({ label, href }) => {
                const active = isActive(pathname, href);

                return (
                  <Link
                    key={label}
                    href={href}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm font-extrabold transition",
                      active
                        ? "bg-[#EFF6FF] text-[#2563EB]"
                        : "text-[#111827] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
                    ].join(" ")}
                    onClick={closeMenu}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {!user ? (
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
            ) : null}
          </div>
        </>
      ) : null}
    </header>
  );
}
