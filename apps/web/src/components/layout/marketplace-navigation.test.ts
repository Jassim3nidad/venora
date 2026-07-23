import { describe, expect, it } from "vitest";
import {
  authPromptKindForHref,
  isMarketplaceNavItemActive,
  isMarketplaceParentActive,
  requiresAuthPrompt,
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

  it("keeps auth-gated destinations as real routes for the auth prompt", () => {
    expect(resolveMarketplaceNavHref("/bookings", false)).toBe("/bookings");
    expect(resolveMarketplaceNavHref("/favorites", false)).toBe("/favorites");
    expect(resolveMarketplaceNavHref("/suppliers", false)).toBe("/suppliers");
  });

  it("flags bookings, favorites, and host-a-venue for the auth prompt", () => {
    expect(requiresAuthPrompt("/bookings")).toBe(true);
    expect(requiresAuthPrompt("/favorites")).toBe(true);
    expect(requiresAuthPrompt("/account/become-partner")).toBe(true);
    expect(requiresAuthPrompt("/venues")).toBe(false);
    expect(authPromptKindForHref("/bookings")).toBe("bookings");
    expect(authPromptKindForHref("/favorites")).toBe("favorites");
    expect(authPromptKindForHref("/account/become-partner")).toBe("host");
  });
});
