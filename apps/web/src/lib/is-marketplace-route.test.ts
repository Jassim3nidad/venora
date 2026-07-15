import { describe, expect, it } from "vitest";
import { isMarketplaceRoute } from "./is-marketplace-route";

describe("isMarketplaceRoute", () => {
  it.each(["/venues", "/suppliers", "/bookings", "/favorites"])(
    "recognizes %s as a marketplace subnavigation route",
    (pathname) => expect(isMarketplaceRoute(pathname)).toBe(true),
  );

  it("excludes Account Center from marketplace subnavigation", () => {
    expect(isMarketplaceRoute("/account")).toBe(false);
  });
});
