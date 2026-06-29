import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { Avatar, AvatarFallback, Separator } from "@venora/ui";
import { MapPin, Globe, Menu, Search } from "lucide-react";

const FOOTER_LINKS = {
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Safety Information", href: "#" },
    { label: "Cancellation Options", href: "#" },
    { label: "Report Concern", href: "#" },
  ],
  Hosting: [
    { label: "Venora your home", href: "#" },
    { label: "Cover for Hosts", href: "#" },
    { label: "Hosting Resources", href: "#" },
    { label: "Community Forum", href: "#" },
  ],
  Venora: [
    { label: "Newsroom", href: "#" },
    { label: "New Features", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Investors", href: "#" },
  ],
};

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "U";

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 font-sans antialiased w-full">
      {/* ─── Airbnb-style Navbar Header ─── */}
      <header className="sticky top-0 z-50 h-20 border-b border-zinc-100 bg-white px-6 md:px-20 w-full">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between w-full">
          {/* Left: Brand Logo */}
          <Link
            href="/"
            id="nav-logo"
            className="flex items-center gap-1.5 font-display text-2xl font-black tracking-tight text-[var(--color-brand-600)] hover:opacity-95 transition-opacity"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-brand-600)] to-brand-400 text-white shadow-sm shadow-brand-500/20">
              <MapPin className="h-5 w-5 fill-white text-transparent" />
            </span>
            <span className="hidden sm:inline font-bold">venora</span>
          </Link>

          {/* Middle: Airbnb Compact Search Pill */}
          <div className="flex items-center gap-3 rounded-full border border-zinc-200 px-4 py-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white text-zinc-800 text-xs font-semibold">
            <span className="px-2 border-r border-zinc-100">Anywhere</span>
            <span className="px-2 border-r border-zinc-100">Any Event</span>
            <span className="px-2 text-zinc-400 font-normal">Add guests</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white">
              <Search className="h-3 w-3" />
            </div>
          </div>

          {/* Right: Actions & User Dropdown */}
          <div className="flex items-center gap-4 text-sm font-semibold text-zinc-700">
            <Link href="/dashboard" className="hidden lg:inline hover:bg-zinc-50 px-4 py-2.5 rounded-full transition-colors">
              Become a Host
            </Link>
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full hover:bg-zinc-50 transition-colors cursor-pointer">
              <Globe className="h-4.5 w-4.5" />
            </div>

            {/* Profile Dropdown Container */}
            <div className="flex items-center gap-3 rounded-full border border-zinc-200 p-1.5 pl-3 hover:shadow-md transition-shadow cursor-pointer bg-white">
              <Menu className="h-4 w-4 text-zinc-500" />
              {user ? (
                <Link href="/account" className="focus:outline-none">
                  <Avatar className="h-8 w-8 ring-2 ring-brand-500/10">
                    <AvatarFallback className="bg-brand-50 text-[var(--color-brand-600)] font-bold">{initials}</AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Link href="/login" className="focus:outline-none">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-500 text-white font-bold text-xs">
                    U
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Layout Wrapper */}
      <main className="flex-1 w-full">{children}</main>

      {/* ─── Airbnb-style Clean Site Footer ─── */}
      <footer className="border-t border-zinc-200 bg-zinc-50 px-6 md:px-20 pb-12 pt-14 text-sm text-zinc-600 w-full">
        <div className="mx-auto max-w-[1600px] space-y-12 w-full">
          {/* Link Columns */}
          <div className="grid gap-8 sm:grid-cols-3">
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title} className="space-y-4">
                <h6 className="font-semibold text-zinc-800 tracking-tight">{title}</h6>
                <ul className="space-y-3 text-[13px] text-zinc-500">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:underline transition-all">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Separator className="bg-zinc-200" />

          {/* Copyright & Secondary Meta */}
          <div className="flex flex-col-reverse items-center justify-between gap-4 text-xs text-zinc-500 md:flex-row">
            <div className="flex flex-wrap items-center gap-3">
              <span>© {new Date().getFullYear()} Venora, Inc.</span>
              <span>·</span>
              <a href="#" className="hover:underline">Privacy</a>
              <span>·</span>
              <a href="#" className="hover:underline">Terms</a>
              <span>·</span>
              <a href="#" className="hover:underline">Sitemap</a>
            </div>
            <div className="flex items-center gap-6 font-semibold text-zinc-700">
              <span className="flex items-center gap-1.5 cursor-pointer hover:underline">
                <Globe className="h-4 w-4" />
                English (US)
              </span>
              <span className="cursor-pointer hover:underline">₱ PHP</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
