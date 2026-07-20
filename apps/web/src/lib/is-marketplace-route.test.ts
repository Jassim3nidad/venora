import { describe, expect, it } from "vitest";
import {
  isAccountCenterRoute,
  isMarketplaceRoute,
} from "./is-marketplace-route";

describe("isMarketplaceRoute", () => {
  it.each([
    "/venues",
    "/suppliers",
    "/bookings",
    "/favorites",
    "/owners/venora-research-venue-network",
  ])(
    "recognizes %s as a marketplace subnavigation route",
    (pathname) => expect(isMarketplaceRoute(pathname)).toBe(true),
  );

  it("excludes Account Center from marketplace subnavigation", () => {
    expect(isMarketplaceRoute("/account")).toBe(false);
  });

  it("recognizes Account Center routes for top-level navigation only", () => {
    expect(isAccountCenterRoute("/account")).toBe(true);
    expect(isAccountCenterRoute("/account/personal-details")).toBe(true);
    expect(isAccountCenterRoute("/settings")).toBe(false);
  });
});
