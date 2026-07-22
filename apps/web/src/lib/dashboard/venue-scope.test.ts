import { describe, expect, it } from "vitest";
import { resolveScopedVenueIds } from "./venue-scope";

describe("resolveScopedVenueIds", () => {
  it("lets admins view every organization venue", () => {
    expect(
      resolveScopedVenueIds({
        isAdmin: true,
        roles: ["event_coordinator"],
        organizationVenueIds: ["venue-a", "venue-b"],
        assignedVenueIds: ["venue-a"],
      }),
    ).toEqual(["venue-a", "venue-b"]);
  });

  it("lets venue owners view every organization venue even if they are also coordinators", () => {
    expect(
      resolveScopedVenueIds({
        isAdmin: false,
        roles: ["venue_owner", "event_coordinator"],
        organizationVenueIds: ["venue-a", "venue-b"],
        assignedVenueIds: ["venue-a"],
      }),
    ).toEqual(["venue-a", "venue-b"]);
  });

  it("limits coordinator-only accounts to explicitly assigned venues", () => {
    expect(
      resolveScopedVenueIds({
        isAdmin: false,
        roles: ["event_coordinator"],
        organizationVenueIds: ["venue-a", "venue-b"],
        assignedVenueIds: ["venue-a"],
      }),
    ).toEqual(["venue-a"]);
  });
});
