import { describe, expect, it } from "vitest";
import {
  getMarketingMobileLinks,
  resolveMarketingMobileHref,
} from "./MarketingNavbar";

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

  it("keeps marketing routes in default mobile mode", () => {
    const links = getMarketingMobileLinks({
      user: { email: "customer@example.com" },
    });

    expect(links.map((link) => [link.label, link.href])).toEqual([
      ["Home", "/"],
      ["Venues", "/venues"],
      ["About", "/about"],
      ["Host a Venue", "/account/become-partner"],
    ]);
  });

  it("redirects anonymous auth-only marketplace routes to login", () => {
    expect(
      resolveMarketingMobileHref({
        href: "/bookings",
        isAuthenticated: false,
        mobileContext: "marketplace",
      }),
    ).toContain("/login?");
    expect(
      resolveMarketingMobileHref({
        href: "/notifications",
        isAuthenticated: false,
        mobileContext: "marketplace",
      }),
    ).toContain("redirectTo=%2Fnotifications");
  });
});
