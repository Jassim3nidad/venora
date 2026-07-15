import { describe, expect, it } from "vitest";
import {
  isMarketplaceNavItemActive,
  isMarketplaceParentActive,
  resolveMarketplaceNavHref,
} from "./marketplace-navigation";

describe("marketplace navigation", () => {
  it.each(["/venues", "/suppliers/qa-supplier", "/bookings", "/favorites"])(
    "keeps the Venues parent active for %s",
    (pathname) => expect(isMarketplaceParentActive(pathname)).toBe(true),
  );

  it("uses Browse only for venue routes", () => {
    expect(isMarketplaceNavItemActive("/venues/example", "/venues")).toBe(true);
    expect(isMarketplaceNavItemActive("/suppliers", "/venues")).toBe(false);
  });

  it("redirects anonymous auth-only tabs to login", () => {
    expect(resolveMarketplaceNavHref("/bookings", false)).toContain("/login?");
    expect(resolveMarketplaceNavHref("/favorites", false)).toContain("/login?");
    expect(resolveMarketplaceNavHref("/suppliers", false)).toBe("/suppliers");
  });
});
