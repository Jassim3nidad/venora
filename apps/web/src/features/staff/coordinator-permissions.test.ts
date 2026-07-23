import { describe, it, expect } from "vitest";
import { canCoordinatorPerformAction } from "./coordinator-permissions";

describe("Event Coordinator Permission Enforcement", () => {
  it("should allow coordinator to manage assigned venue availability", () => {
    const allowed = canCoordinatorPerformAction(
      {
        role: "coordinator",
        isOrganizationOwner: false,
        assignedVenueIds: ["v-100"],
      },
      "manage_availability",
      "v-100"
    );
    expect(allowed).toBe(true);
  });

  it("should deny coordinator access to unassigned venues", () => {
    const allowed = canCoordinatorPerformAction(
      {
        role: "coordinator",
        isOrganizationOwner: false,
        assignedVenueIds: ["v-100"],
      },
      "manage_availability",
      "v-999"
    );
    expect(allowed).toBe(false);
  });
});
