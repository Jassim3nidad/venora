import { describe, expect, it } from "vitest";
import { ROLES, defaultRouteForRoles } from "./roles";

describe("defaultRouteForRoles", () => {
  it("routes event coordinators to the existing coordinator dashboard", () => {
    expect(defaultRouteForRoles([ROLES.EVENT_COORDINATOR])).toBe(
      "/dashboard/coordinator",
    );
  });

  it("keeps higher-priority owner/admin routes ahead of coordinator", () => {
    expect(
      defaultRouteForRoles([ROLES.EVENT_COORDINATOR, ROLES.VENUE_OWNER]),
    ).toBe("/dashboard/venue-owner");
    expect(defaultRouteForRoles([ROLES.EVENT_COORDINATOR, ROLES.ADMIN])).toBe(
      "/dashboard/admin",
    );
  });
});
