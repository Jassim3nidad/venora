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
