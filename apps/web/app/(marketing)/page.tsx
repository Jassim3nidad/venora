"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  MapPin,
  Menu,
  Search,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";

const featuredVenues = [
  {
    name: "The Foundry Loft",
    location: "Makati City",
    price: "₱85,000",
    rating: "4.8",
    category: "Industrial",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAFJ3wQrOI59wJRDVjDuhVHBym1PFzFZt8qVSJ54ke-PoJFVkYVfcgghztWHyEW-5PvBNYU9Pe94qBrKyweMDyTdmwFB1VFSlZLqzLxDZ2OAViAcnGoUs4G0SfbcmZnolW-g0yYDRbpr3pgMs4VNJFzTvDqwYDlse85um56CwlVDsvJch6I4oiZjn2LNDTQ0-1BWlnAJYV4V_cwswL17qivzVQYF60Cu82Z7g3pXCTSnAh5rSBChJg_Cg",
    alt: "A bright, airy industrial loft event space with exposed brick, large windows, and polished concrete floors.",
    filledHeart: true,
  },
  {
    name: "Rosewood Pavilion",
    location: "Antipolo",
    price: "₱150,000",
    rating: "4.9",
    category: "Outdoor",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDByzvwqt-vjG2KfX9hYLE_7lBbX6K2up1Q0Oa9xn97AiQf9SCN6LcZckrig72KBpTWHMMHhfGFtiep2ukWGoG2dAyorFgByk0-XNqRUd08rneXGoMP9ilE3OeSgXmFy6BBCkDT7NRAW8HFUaUTrA6h_OfBflVjvUYFs492DvW8dK509vCGA41l9HS--XuX6g17IUFw4T9M8Bw7m7_beB1kHLXhb6BTp7fX8obrHQJXFnXVjzOwn9JxZw",
    alt: "An elegant outdoor pavilion with a manicured lawn, white tent structure, and warm string lights.",
    filledHeart: false,
  },
  {
    name: "The Glasshouse Estate",
    location: "Tagaytay",
    price: "₱120,000",
    rating: "4.9",
    category: "Estate",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAHn1I2QEWfbx_gmkoGeOwk9N4C7-C2T-m6T8Ip-wDfM0BsKS7DYzHoLOEUty1bvix6WA5sRtdAz7ZpWb7tcF0L3vcPRbafYejBJXKX7gvJq9BbtvzFfx6ZziFVQbqRIV9pydLLbsxeQJpiAnlltaSdfyVQy6RZcgUXNuV5HqlYn8ZXLh7BhsetSM3jabmu5UjpQZGF31WnMxSj95SqUA6boo4rJ4Ss9D4J9YfOS2X3nQGtuTfJfVVy9Q",
    alt: "A luxurious modern glasshouse estate venue surrounded by greenery in Tagaytay.",
    filledHeart: false,
  },
];

const stats = [
  { value: "500+", label: "Curated Venues" },
  { value: "4.8", label: "Average Rating" },
  { value: "24/7", label: "Planning Support" },
  { value: "100%", label: "Verified Partners" },
];

const desktopNavLinks = [
  { label: "Experiences", href: "/venues" },
  { label: "Planning Tools", href: "/bookings" },
  { label: "Host a Venue", href: "/register" },
];

const mobileNavLinks = [
  { label: "Venues", href: "/venues" },
  ...desktopNavLinks,
];

const footerLinkGroups = [
  [
    { label: "About Us", href: "/about" },
    { label: "Press", href: "/about" },
    { label: "Careers", href: "/about" },
  ],
  [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Help Center", href: "/about" },
  ],
  [
    { label: "List Your Venue", href: "/register" },
    { label: "Partner Program", href: "/register" },
  ],
];

export default function MarketingHomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F9FAFB] text-[#111827] antialiased">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB]/80 bg-white/90 backdrop-blur-xl">
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
            <Link
              className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-extrabold text-[#2563EB] transition hover:text-[#1d4ed8]"
              href="/venues"
            >
              Venues
            </Link>
            {desktopNavLinks.map(({ label, href }) => (
              <Link
                key={label}
                className="rounded-full px-4 py-2 text-sm font-bold text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                href={href}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center justify-end gap-3 justify-self-end md:flex">
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
          </div>

          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1D4ED8] transition hover:bg-[#EFF6FF] md:hidden"
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/35 md:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
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
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>

            <p className="mb-5 text-xl font-black tracking-[-0.04em] text-[#2563EB]">
              Venora
            </p>
            <nav className="grid gap-2">
              {mobileNavLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-2xl px-4 py-3 text-sm font-extrabold text-[#111827] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-5 grid gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] text-sm font-extrabold text-[#1D4ED8]"
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-extrabold text-white"
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </>
      ) : null}

      <main className="w-full flex-grow">
        {/* Hero Section */}
        <section className="relative w-full py-14 md:py-24">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#EFF6FF] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8]">
                <Sparkles className="h-3.5 w-3.5" />
                Premium event venue marketplace
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.05em] text-[#111827] sm:text-5xl md:text-6xl">
                Where Extraordinary Events Begin
              </h1>
              <p className="mt-5 max-w-xl text-base font-medium leading-7 text-[#6B7280] sm:text-lg">
                Discover, compare, and book the perfect space for your next
                event. The premier marketplace for curated, high-quality venues.
              </p>

              <div className="flex flex-col gap-3 pt-7 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-7 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
                  href="/venues"
                >
                  Browse Venues
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-7 text-sm font-extrabold text-[#1D4ED8] shadow-sm transition hover:bg-[#EFF6FF]"
                  href="/register"
                >
                  List Your Venue
                </Link>
              </div>

              {/* Search Bar */}
              <div className="mt-8 w-full max-w-2xl rounded-[24px] border border-[#E5E7EB] bg-white p-2 shadow-xl shadow-slate-200/60">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-stretch">
                  <div className="min-w-0 border-b border-[#E5E7EB] px-4 py-3 md:border-b-0 md:border-r">
                    <label
                      className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1D4ED8]"
                      htmlFor="hero-search-location"
                    >
                      Location
                    </label>
                    <input
                      id="hero-search-location"
                      className="mt-1 w-full min-w-0 border-none bg-transparent p-0 text-sm font-semibold text-[#111827] outline-none placeholder:text-slate-400"
                      placeholder="Where to?"
                      type="text"
                    />
                  </div>
                  <div className="min-w-0 border-b border-[#E5E7EB] px-4 py-3 md:border-b-0 md:border-r">
                    <label
                      className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1D4ED8]"
                      htmlFor="hero-search-event-type"
                    >
                      Event Type
                    </label>
                    <input
                      id="hero-search-event-type"
                      className="mt-1 w-full min-w-0 border-none bg-transparent p-0 text-sm font-semibold text-[#111827] outline-none placeholder:text-slate-400"
                      placeholder="Wedding, Corporate..."
                      type="text"
                    />
                  </div>
                  <Link
                    className="m-2 inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white transition hover:bg-[#1d4ed8] md:self-center"
                    href="/venues"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </Link>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="relative hidden min-h-[420px] items-center justify-center overflow-hidden lg:flex">
              <div className="w-full max-w-md rotate-2 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-2xl shadow-slate-200/70 transition-transform duration-300 hover:rotate-0">
                <div className="relative mb-4 h-64 w-full overflow-hidden rounded-[22px]">
                  <img
                    className="h-full w-full object-cover"
                    alt="A stunning modern glasshouse estate venue set among lush greenery in Tagaytay."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7HE3d2-uKCIMbAq9bQFg1CLg2QepJelmFZ2eWrGjz5cnOO6K72UKsfIcD18IVbvomw79WofVwHkZWUxX9s6IUSUJbtrv4hAJrk02qGMsjiFpZldDlUz9kw_1dg8LDGb4Ud82QI9ovXS1UQZL4d7g9lxJLROg6hRG-QeWk8C6xLwQqf6d-9wB9qKwX2lZZuSob8vy_KQY1zLZY2kCpakrmp0B8_M-LcM50UrA41QdfkmAOo8Lv8wwv1g"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-[#111827] shadow-sm backdrop-blur">
                    <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                    4.9
                  </div>
                </div>

                <h3 className="mb-1 text-xl font-black tracking-[-0.03em] text-[#111827]">
                  The Glasshouse Estate
                </h3>
                <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[#6B7280]">
                  <MapPin className="h-4 w-4" />
                  Tagaytay
                </p>

                <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Starting at
                    </p>
                    <p className="text-lg font-black text-[#111827]">
                      ₱120,000
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#6B7280]">
                    <Users className="h-3.5 w-3.5" />
                    300 pax
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="w-full border-y border-[#E5E7EB] bg-[#F8FAFC] py-6">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-6 px-4 text-center sm:px-6 md:grid-cols-4 lg:px-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-black tracking-[-0.03em] text-[#111827]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Venues */}
        <section className="w-full py-14 md:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.04em] text-[#111827] md:text-4xl">
                  Featured Venues
                </h2>
                <p className="mt-2 text-base font-medium text-[#6B7280]">
                  Discover our most sought-after spaces.
                </p>
              </div>
              <Link
                className="hidden items-center gap-2 text-sm font-extrabold text-[#2563EB] transition hover:text-[#1D4ED8] md:flex"
                href="/venues"
              >
                View All Venues
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {featuredVenues.map((venue) => (
                <Link
                  key={venue.name}
                  className="group block overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-slate-200/80"
                  href="/venues"
                >
                  <div className="relative h-52 w-full overflow-hidden">
                    <img
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      alt={venue.alt}
                      src={venue.image}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1D4ED8] shadow-sm backdrop-blur">
                      {venue.category}
                    </div>
                    <span
                      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition group-hover:text-red-500"
                      aria-label="Save venue"
                    >
                      <Heart
                        className={[
                          "h-4 w-4",
                          venue.filledHeart ? "fill-red-500 text-red-500" : "",
                        ].join(" ")}
                      />
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-[#111827]">
                        {venue.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-extrabold text-[#111827]">
                        <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                        {venue.rating}
                      </div>
                    </div>
                    <p className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-[#6B7280]">
                      <MapPin className="h-4 w-4" />
                      {venue.location}
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <p className="text-base font-black text-[#111827]">
                        {venue.price}
                      </p>
                      <span className="text-sm font-extrabold text-[#2563EB]">
                        View details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#2563EB] transition hover:bg-[#EFF6FF] md:hidden"
              href="/venues"
            >
              View All Venues
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E5E7EB] bg-white py-12">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4 text-xl font-black tracking-[-0.04em] text-[#2563EB]">
              Venora
            </div>
            <p className="text-sm font-medium leading-6 text-[#6B7280]">
              (c) 2024 Venora Marketplace. AI-powered venue curation.
            </p>
          </div>

          {footerLinkGroups.map((group, index) => (
            <div key={index} className="flex flex-col space-y-2">
              {group.map(({ label, href }) => (
                <Link
                  key={label}
                  className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280] transition hover:text-[#2563EB]"
                  href={href}
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
