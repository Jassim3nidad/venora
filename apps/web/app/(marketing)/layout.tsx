import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { Avatar, AvatarFallback, Separator } from "@venora/ui";
import { MapPin, Sparkles } from "lucide-react";

const NAV_LINKS = [
  { href: "/venues", label: "Browse Venues" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
];

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Extract initials if user profile exists
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "U";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      {/* Sticky Header Nav */}
      <header className="glass fixed left-0 right-0 top-0 z-50 h-16 border-b border-[var(--border-default)]">
        <nav className="container flex h-full items-center justify-between">
          <Link
            href="/"
            id="nav-logo"
            className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-[var(--text-primary)] hover:opacity-90 transition-opacity"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--color-brand-600)] to-[var(--color-accent-500)] text-white">
              <MapPin className="h-4 w-4" />
            </span>
            <span>Venora</span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="hidden text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors md:block"
                >
                  Dashboard
                </Link>
                <Link href="/account" className="focus:outline-none">
                  <Avatar className="h-8 w-8 hover:opacity-85 transition-opacity ring-2 ring-brand-500/20">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                id="nav-login-btn"
                className="rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-brand)] hover:bg-[var(--color-brand-700)] transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Main Page Layout Wrapper */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Premium Airbnb-style Footer */}
      <footer className="border-t border-[var(--border-default)] bg-[var(--bg-subtle)] pb-12 pt-16 text-sm text-[var(--text-secondary)]">
        <div className="container grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-4">
            <h5 className="font-display font-bold text-[var(--text-primary)]">Venora</h5>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Discover and book stunning event venues across the Philippines. Weddings, corporate events, and celebrations made seamless.
            </p>
          </div>
          <div className="space-y-3">
            <h6 className="font-semibold text-[var(--text-primary)]">Discovery</h6>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/venues?category=garden" className="hover:underline">Garden Venues</Link>
              </li>
              <li>
                <Link href="/venues?category=beach" className="hover:underline">Beach Venues</Link>
              </li>
              <li>
                <Link href="/venues?category=resort" className="hover:underline">Resort Classifications</Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h6 className="font-semibold text-[var(--text-primary)]">Resources</h6>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/design-system" className="hover:underline">UI Design System</Link>
              </li>
              <li>
                <Link href="/about" className="hover:underline">About platform</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:underline">Pricing Packages</Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h6 className="font-semibold text-[var(--text-primary)]">Corporate</h6>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Venora Inc.<br />
              Manila, Metro Manila, PH
            </p>
          </div>
        </div>
        <div className="container mt-12">
          <Separator className="mb-6" />
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-[var(--text-muted)] sm:flex-row">
            <p>© {new Date().getFullYear()} Venora. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:underline">Privacy Policy</a>
              <a href="#" className="hover:underline">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
