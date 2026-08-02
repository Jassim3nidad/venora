import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getMarketingMobileLinks,
  resolveMarketingMobileHref,
} from "./MarketingNavbar";

const appRoot = resolve(import.meta.dirname, "../../..");
const readSource = (path: string) =>
  readFileSync(resolve(appRoot, path), "utf8");

describe("MarketingNavbar mobile links", () => {
  it("uses customer marketplace routes in embedded marketplace mode", () => {
    const links = getMarketingMobileLinks({
      user: { email: "customer@example.com" },
      mobileContext: "marketplace",
    });

    expect(links.map((link) => [link.label, link.href])).toEqual([
      ["Venues", "/venues"],
      ["Suppliers", "/suppliers"],
      ["Bookings", "/bookings"],
      ["Favorites", "/favorites"],
      ["Notifications", "/notifications"],
    ]);
  });

  it("shows bookings and favorites to anonymous marketplace visitors", () => {
    const links = getMarketingMobileLinks({
      user: null,
      mobileContext: "marketplace",
    });

    expect(links.map((link) => link.label)).toEqual([
      "Venues",
      "Suppliers",
      "Bookings",
      "Favorites",
    ]);
  });

  it("keeps marketing routes in default mobile mode", () => {
    const links = getMarketingMobileLinks({
      user: { email: "customer@example.com" },
    });

    expect(links.map((link) => [link.label, link.href])).toEqual([
      ["Home", "/"],
      ["Browse", "/venues"],
      ["About", "/about"],
      ["Host a Venue", "/account/become-partner"],
    ]);
  });

  it("keeps bookings/favorites as real routes for anonymous users", () => {
    expect(
      resolveMarketingMobileHref({
        href: "/bookings",
        isAuthenticated: false,
        mobileContext: "marketplace",
      }),
    ).toBe("/bookings");
    expect(
      resolveMarketingMobileHref({
        href: "/notifications",
        isAuthenticated: false,
        mobileContext: "marketplace",
      }),
    ).toContain("redirectTo=%2Fnotifications");
  });
});

describe("cinematic venue navbar contract", () => {
  it("selects the immersive variant through one observed marketplace shell", () => {
    const source = readSource("src/components/layout/MarketplaceLayout.tsx");

    expect(source).toContain("isImmersiveVenueProfileRoute(pathname)");
    expect(source).toContain("new MutationObserver");
    expect(source).toContain('window.addEventListener("scroll", handleScroll');
    expect(source).toContain("window.requestAnimationFrame(updateState)");
    expect(source).toContain('window.addEventListener("resize", handleResize)');
    expect(source).toContain('variant={immersiveVenueProfile ? "immersive"');
    expect(source).toContain('appearance={immersiveVenueProfile ? "immersive"');
  });

  it("provides readable top, scrolled, fallback, and reduced-motion states", () => {
    const source = readSource("src/components/layout/MarketingNavbar.tsx");

    expect(source).toContain("data-navbar-state=");
    expect(source).toContain("bg-[#07100D]/82");
    expect(source).toContain("bg-[#07100D]/90");
    expect(source).toContain("supports-[backdrop-filter]:backdrop-blur-[16px]");
    expect(source).toContain("motion-reduce:transition-none");
    expect(source).toContain('aria-current={active ? "page" : undefined}');
  });

  it("keeps the mobile drawer solid and all existing interaction semantics", () => {
    const source = readSource("src/components/layout/MarketingNavbar.tsx");

    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("aria-expanded={menuOpen}");
    expect(source).toContain("bg-[#07100D] shadow-black/40");
    expect(source).toContain("useFocusTrap(menuOpen, closeMenu)");
  });

  it("integrates with the hero and preserves the dashboard-only preview", () => {
    const hero = readSource("src/features/venues/ui/ImmersiveVenueHero.tsx");
    const preview = readSource(
      "app/(venue-owner)/dashboard/venues/[id]/experience/preview/page.tsx",
    );

    expect(hero).toContain("data-immersive-venue-hero");
    expect(hero).toContain('className="sticky top-32');
    expect(preview).not.toContain("MarketingNavbar");
    expect(preview).not.toContain('variant="immersive"');
  });
});
