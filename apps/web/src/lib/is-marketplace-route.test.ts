import { describe, expect, it } from "vitest";
import {
  isAccountCenterRoute,
  isImmersiveVenueProfileRoute,
  isMarketplaceRoute,
} from "./is-marketplace-route";

describe("isMarketplaceRoute", () => {
  it.each([
    "/venues",
    "/suppliers",
    "/bookings",
    "/favorites",
    "/owners/venora-research-venue-network",
  ])("recognizes %s as a marketplace subnavigation route", (pathname) =>
    expect(isMarketplaceRoute(pathname)).toBe(true),
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

describe("isImmersiveVenueProfileRoute", () => {
  it("targets only a public venue detail route", () => {
    expect(isImmersiveVenueProfileRoute("/venues/amorita-resort")).toBe(true);
    expect(isImmersiveVenueProfileRoute("/venues")).toBe(false);
    expect(isImmersiveVenueProfileRoute("/venues/amorita-resort/book")).toBe(
      false,
    );
    expect(isImmersiveVenueProfileRoute("/suppliers/sai-s-photography")).toBe(
      false,
    );
    expect(
      isImmersiveVenueProfileRoute(
        "/dashboard/venues/venue-id/experience/preview",
      ),
    ).toBe(false);
  });
});
