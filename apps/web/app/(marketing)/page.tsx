"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function MarketingHomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full max-w-full flex flex-col overflow-x-hidden bg-surface text-on-background antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap');

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }

        .bg-surface { background-color: #f7f9fb; }
        .bg-surface\\/90 { background-color: rgba(247, 249, 251, 0.9); }
        .bg-surface-bright { background-color: #f7f9fb; }
        .bg-surface-container-lowest { background-color: #ffffff; }
        .bg-surface-container-low { background-color: #f2f4f6; }
        .bg-primary-container { background-color: #e07a5f; }
        .bg-inverse-surface { background-color: #2d3133; }
        .text-primary { color: #9a442d; }
        .text-primary-container { color: #e07a5f; }
        .text-primary-fixed { color: #ffdbd2; }
        .text-secondary { color: #565e74; }
        .text-secondary-fixed-dim { color: #bec6e0; }
        .text-on-primary { color: #ffffff; }
        .text-on-surface { color: #191c1e; }
        .text-on-background { color: #191c1e; }
        .text-on-secondary-container { color: #5c647a; }
        .border-outline-variant\\/30 { border-color: rgba(219, 193, 186, 0.3); }
        .border-surface-container-highest { border-color: #e0e3e5; }
        .border-primary { border-color: #9a442d; }
        .max-w-container_max_width { max-width: 1280px; width: 100%; }
        .page-container { width: 100%; max-width: 1280px; margin-left: auto; margin-right: auto; padding-left: 16px; padding-right: 16px; }
        .px-margin_desktop { padding-left: 32px; padding-right: 32px; }
        .px-margin_mobile { padding-left: 16px; padding-right: 16px; }
        .site-header-inner { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; width: 100%; height: 80px; }
        .site-header-nav { display: none; align-items: center; justify-content: center; gap: 32px; }
        .site-header-actions { display: none; align-items: center; justify-content: flex-end; gap: 16px; }
        .hero-search { display: grid; grid-template-columns: 1fr; width: 100%; }
        .hero-search-field { min-width: 0; padding: 12px 16px; }
        .hero-search-field input { width: 100%; min-width: 0; margin-top: 4px; outline: none; }

        @media (min-width: 768px) {
          .page-container { padding-left: 32px; padding-right: 32px; }
          .site-header-nav { display: flex; }
          .site-header-actions { display: flex; }
          .hero-search { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: stretch; }
        }
        .py-stack_xl { padding-top: 48px; padding-bottom: 48px; }
        .pt-stack_xl { padding-top: 48px; }
        .pb-stack_xl { padding-bottom: 48px; }
        .py-stack_md { padding-top: 16px; padding-bottom: 16px; }
        .p-stack_md { padding: 16px; }
        .pt-stack_sm { padding-top: 8px; }
        .pt-stack_lg { padding-top: 24px; }
        .mb-stack_lg { margin-bottom: 24px; }
        .mt-stack_lg { margin-top: 24px; }
        .mt-stack_md { margin-top: 16px; }
        .gap-gutter { gap: 24px; }
        .gap-stack_sm { gap: 8px; }
        .space-y-stack_md > :not([hidden]) ~ :not([hidden]) { margin-top: 16px; }
        .font-display-md, .font-display-lg, .font-headline-md, .font-headline-lg, .font-headline-lg-mobile { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-body-md, .font-body-lg, .font-body-sm, .font-button, .font-label-caps { font-family: 'Inter', sans-serif; }
        .text-display-md { font-size: 36px; line-height: 44px; letter-spacing: -0.02em; font-weight: 700; }
        .text-display-lg { font-size: 48px; line-height: 56px; letter-spacing: -0.02em; font-weight: 700; }
        .text-headline-md { font-size: 20px; line-height: 28px; font-weight: 600; }
        .text-headline-lg-mobile { font-size: 24px; line-height: 32px; font-weight: 600; }
        .text-headline-lg { font-size: 30px; line-height: 38px; letter-spacing: -0.01em; font-weight: 600; }
        .text-body-lg { font-size: 18px; line-height: 28px; font-weight: 400; }
        .text-body-md { font-size: 16px; line-height: 24px; font-weight: 400; }
        .text-body-sm { font-size: 14px; line-height: 20px; font-weight: 400; }
        .text-button { font-size: 14px; line-height: 20px; font-weight: 600; }
        .text-label-caps { font-size: 11px; line-height: 16px; letter-spacing: 0.08em; font-weight: 700; }
        .venue-card { transition: all 0.2s ease-in-out; }
        .venue-card:hover { border-color: #CBD5E1; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
        .venue-card-img-overlay { transition: opacity 0.2s ease; }
        .venue-card:hover .venue-card-img-overlay { opacity: 0.02; }

        @media (min-width: 768px) {
          .md\\:px-margin_desktop { padding-left: 32px; padding-right: 32px; }
          .md\\:font-display-lg { font-family: 'Plus Jakarta Sans', sans-serif; }
          .md\\:text-display-lg { font-size: 48px; line-height: 56px; letter-spacing: -0.02em; font-weight: 700; }
          .md\\:font-headline-lg { font-family: 'Plus Jakarta Sans', sans-serif; }
          .md\\:text-headline-lg { font-size: 30px; line-height: 38px; letter-spacing: -0.01em; font-weight: 600; }
        }
        .mobile-menu-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 40;
        }

        .mobile-menu-panel {
          position: fixed;
          inset: auto 0 0 0;
          z-index: 50;
          background: #ffffff;
          border-top: 1px solid #e0e3e5;
          box-shadow: 0 -16px 40px rgba(15, 23, 42, 0.12);
          padding: 20px 16px 24px;
        }

        .mobile-menu-panel nav,
        .mobile-menu-panel .auth-links {
          display: grid;
          gap: 16px;
        }

        .mobile-menu-close {
          position: absolute;
          top: 16px;
          right: 16px;
          border: none;
          background: transparent;
          color: #191c1e;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }      `}</style>

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full bg-surface/90 darkbg-surface-dim/ backdrop-blur-md border-b border-outline-variant/30">
        <div className="page-container site-header-inner">
          <Link
            className="text-headline-md font-headline-md font-bold shrink-0 justify-self-start text-[#E07A5F]"
            href="/"
          >
            Venora
          </Link>
          {/* landing page */}
          <nav className="site-header-nav" aria-label="Main navigation">
            <Link
              className="font-body-md text-body-md text-primary border-b-2 border-primary pb-1 whitespace-nowrap hover:opacity-80 transition-opacity active:scale-95 duration-150"
              href="/venues"
            >
              Venues
            </Link>
            <Link
              className="font-body-md text-body-md text-secondary whitespace-nowrap hover:text-primary transition-colors hover:opacity-80 active:scale-95 duration-150"
              href="/venues"
            >
              Experiences
            </Link>
            <Link
              className="font-body-md text-body-md text-secondary whitespace-nowrap hover:text-primary transition-colors hover:opacity-80 active:scale-95 duration-150"
              href="/bookings"
            >
              Planning Tools
            </Link>
            <Link
              className="font-body-md text-body-md text-secondary whitespace-nowrap hover:text-primary transition-colors hover:opacity-80 active:scale-95 duration-150"
              href="/register"
            >
              Host a Venue
            </Link>
          </nav>

          <div className="site-header-actions justify-self-end">
            <Link
              className="font-button text-button text-on-surface whitespace-nowrap hover:opacity-80 transition-opacity"
              href="/login"
            >
              Log In
            </Link>
            <Link
              className="inline-flex h-[50px] min-w-[70px] items-center justify-center rounded-[32px] bg-primary-container px-[36px] text-[15px] font-semibold text-on-primary whitespace-nowrap hover:opacity-80 transition-opacity"              href="/register"
            >
              Sign Up
            </Link>
          </div>

          <button
            className="md:hidden text-primary justify-self-end col-start-3"
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <>
          <div
            className="mobile-menu-backdrop md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="mobile-menu-panel md:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <button
              className="mobile-menu-close"
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              ×
            </button>
            <nav className="space-y-3">
              <Link
                href="/venues"
                className="block font-body-md text-body-md text-on-surface hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Venues
              </Link>
              <Link
                href="/venues"
                className="block font-body-md text-body-md text-on-surface hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Experiences
              </Link>
              <Link
                href="/bookings"
                className="block font-body-md text-body-md text-on-surface hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Planning Tools
              </Link>
              <Link
                href="/register"
                className="block font-body-md text-body-md text-on-surface hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Host a Venue
              </Link>
            </nav>
            <div className="auth-links mt-6 space-y-3">
              <Link
                href="/login"
                className="block font-button text-button text-on-surface hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 w-full items-center justify-center rounded-[32px] bg-primary-container px-6 text-[15px] font-semibold text-on-primary hover:opacity-90 transition-opacity"
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </>
      ) : null}

      <main className="flex-grow w-full">
        {/* Hero Section */}
        <section className="relative w-full pt-stack_xl pb-stack_xl md:pt-32 md:pb-32">
          <div className="page-container grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
            <div className="space-y-stack_md min-w-0">
              <h1 className="font-display-md text-display-md md:font-display-lg md:text-display-lg text-on-surface">
                Where Extraordinary Events Begin
              </h1>
              <p className="font-body-lg text-body-lg text-secondary max-w-xl">
                Discover, compare, and book the perfect space for your next
                event. The premier marketplace for curated, high-quality venues.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 pt-stack_sm">
                <Link
                  className="font-button !text-[12px] bg-primary-container font-bold text-on-primary h-12 !min-w-[120px] px-8 rounded-lg flex items-center justify-center whitespace-nowrap hover:opacity-90 transition-opacity"                  
                  href="/venues"
                >
                  Browse Venues
                </Link>
                <Link
                  className="font-button !text-[12px] bg-surface-container-lowest font-bold text-on-surface border border-surface-container-highest h-12 !min-w-[120px] px-8 rounded-lg flex items-center justify-center whitespace-nowrap hover:bg-surface-container-low transition-colors"                  href="/register"
                >
                  List Your Venue
                </Link>
              </div>

              {/* Search Bar */}
              <div className="mt-stack_lg w-full max-w-2xl bg-surface-container-lowest p-2 rounded-xl border border-surface-container-highest shadow-sm">
                <div className="hero-search">
                  <div className="hero-search-field border-b md:border-b-0 md:border-r border-surface-container-highest">
                    <label
                      className="block font-label-caps text-label-caps text-secondary"
                      htmlFor="hero-search-location"
                    >
                      Location
                    </label>
                    <input
                      id="hero-search-location"
                      className="bg-transparent border-none p-0 focus:ring-0 font-body-md text-body-md text-on-surface placeholder-secondary-fixed-dim"
                      placeholder="Where to?"
                      type="text"
                    />
                  </div>
                  <div className="hero-search-field border-b md:border-b-0 md:border-r border-surface-container-highest">
                    <label
                      className="block font-label-caps text-label-caps text-secondary"
                      htmlFor="hero-search-event-type"
                    >
                      Event Type
                    </label>
                    <input
                      id="hero-search-event-type"
                      className="bg-transparent border-none p-0 focus:ring-0 font-body-md text-body-md text-on-surface placeholder-secondary-fixed-dim"
                      placeholder="Wedding, Corporate..."
                      type="text"
                    />
                  </div>
                  <Link
                    className="shrink-0 self-stretch md:self-center h-12 px-6 m-2 md:m-0 md:mx-2 bg-primary-container text-on-primary rounded-lg font-button text-button inline-flex items-center justify-center gap-2 whitespace-nowrap hover:opacity-90 transition-opacity"
                    href="/venues"
                  >
                    <span className="material-symbols-outlined">search</span>
                    Search
                  </Link>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="relative hidden lg:flex lg:items-center lg:justify-center lg:min-h-[420px] overflow-hidden">
              <div className="bg-surface-container-lowest p-4 rounded-[20px] border border-surface-container-highest shadow-sm rotate-2 hover:rotate-0 transition-transform duration-300 w-full max-w-md">
                <div className="relative w-full h-64 rounded-xl overflow-hidden mb-4">
                  <img
                    className="object-cover w-full h-full"
                    alt="A stunning modern glasshouse estate venue set among lush greenery in Tagaytay."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7HE3d2-uKCIMbAq9bQFg1CLg2QepJelmFZ2eWrGjz5cnOO6K72UKsfIcD18IVbvomw79WofVwHkZWUxX9s6IUSUJbtrv4hAJrk02qGMsjiFpZldDlUz9kw_1dg8LDGb4Ud82QI9ovXS1UQZL4d7g9lxJLROg6hRG-QeWk8C6xLwQqf6d-9wB9qKwX2lZZuSob8vy_KQY1zLZY2kCpakrmp0B8_M-LcM50UrA41QdfkmAOo8Lv8wwv1g"
                  />
                  <div className="absolute top-4 right-4 bg-surface-container-lowest px-3 py-1 rounded-full font-label-caps text-label-caps text-on-surface flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-primary-container">
                      star
                    </span>
                    4.9
                  </div>
                </div>

                <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
                  The Glasshouse Estate
                </h3>
                <p className="font-body-sm text-body-sm text-secondary mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">
                    location_on
                  </span>{" "}
                  Tagaytay
                </p>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-label-caps text-label-caps text-secondary">
                      Starting at
                    </p>
                    <p className="font-body-lg text-body-lg font-bold text-on-surface">
                      ₱120,000
                    </p>
                  </div>
                  <div className="font-body-sm text-body-sm text-secondary flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-lg">
                    <span className="material-symbols-outlined text-[16px]">
                      group
                    </span>
                    300 pax
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="w-full border-y border-surface-container-highest bg-surface-bright py-stack_md">
          <div className="page-container grid grid-cols-2 md:grid-cols-4 gap-gutter text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-headline-md text-headline-md text-on-surface">
                  {stat.value}
                </p>
                <p className="font-label-caps text-label-caps text-secondary mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Venues */}
        <section className="w-full py-stack_xl">
          <div className="page-container">
            <div className="flex justify-between items-end mb-stack_lg">
              <div>
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface">
                  Featured Venues
                </h2>
                <p className="font-body-md text-body-md text-secondary mt-2">
                  Discover our most sought-after spaces.
                </p>
              </div>
              <Link
                className="hidden md:flex font-button text-button text-primary items-center gap-1 hover:opacity-80 transition-opacity"
                href="/venues"
              >
                View All Venues
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {featuredVenues.map((venue) => (
              <Link
                key={venue.name}
                className="venue-card bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden block"
                href="/venues"
              >
                <div className="relative h-48 w-full">
                  <img
                    className="object-cover w-full h-full"
                    alt={venue.alt}
                    src={venue.image}
                  />
                  <div className="venue-card-img-overlay absolute inset-0 bg-black opacity-0" />
                  <div className="absolute top-3 left-3 bg-surface-container-lowest px-2 py-1 rounded font-label-caps text-label-caps text-on-surface shadow-sm">
                    {venue.category}
                  </div>
                  <button
                    className="absolute top-3 right-3 text-surface-container-lowest hover:text-primary-container transition-colors"
                    type="button"
                    aria-label="Save venue"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={
                        venue.filledHeart
                          ? { fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                    >
                      favorite
                    </span>
                  </button>
                </div>

                <div className="p-stack_md">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-headline-md text-headline-md text-on-surface">
                      {venue.name}
                    </h3>
                    <div className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface">
                      <span className="material-symbols-outlined text-[16px] text-primary-container">
                        star
                      </span>
                      {venue.rating}
                    </div>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary mb-4 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      location_on
                    </span>
                    {venue.location}
                  </p>
                  <div className="border-t border-surface-container-highest pt-4 flex justify-between items-center">
                    <p className="font-body-md text-body-md font-bold text-on-surface">
                      {venue.price}
                    </p>
                    <span className="font-button text-button text-primary">
                      View details
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            </div>

            <Link
              className="md:hidden mt-stack_md font-button text-button text-primary flex items-center justify-center gap-1 hover:opacity-80 transition-opacity w-full border border-surface-container-highest rounded-lg h-12 bg-surface-container-lowest"
              href="/venues"
            >
              View All Venues
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest w-full py-stack_xl border-t border-outline-variant flat no shadows transition-all duration-200">
        <div className="page-container grid grid-cols-2 md:grid-cols-4 gap-gutter">
          <div className="col-span-2 md:col-span-1">
            <div className="text-headline-md font-headline-md font-bold text-primary mb-4">
              Venora
            </div>
            <p className="font-body-sm text-body-sm text-on-secondary-container">
              © 2024 Venora Marketplace. AI-Powered Venue Curation.
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <Link
              className="font-label-caps text-label-caps text-on-secondary-container hover:text-primary underline"
              href="/about"
            >
              About Us
            </Link>
            <Link
              className="font-label-caps text-label-caps text-on-secondary-container hover:text-primary underline"
              href="/about"
            >
              Press
            </Link>
            <Link
              className="font-label-caps text-label-caps text-on-secondary-container hover:text-primary underline"
              href="/about"
            >
              Careers
            </Link>
          </div>

          <div className="flex flex-col space-y-2">
            <Link
              className="font-label-caps text-label-caps text-on-secondary-container hover:text-primary underline"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            <Link
              className="font-label-caps text-label-caps text-on-secondary-container hover:text-primary underline"
              href="/terms"
            >
              Terms of Service
            </Link>
            <Link
              className="font-label-caps text-label-caps text-on-secondary-container hover:text-primary underline"
              href="/about"
            >
              Help Center
            </Link>
          </div>

          <div className="flex flex-col space-y-2">
            <Link
              className="font-label-caps text-label-caps text-on-secondary-container hover:text-primary underline"
              href="/register"
            >
              List Your Venue
            </Link>
            <Link
              className="font-label-caps text-label-caps text-on-secondary-container hover:text-primary underline"
              href="/register"
            >
              Partner Program
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
