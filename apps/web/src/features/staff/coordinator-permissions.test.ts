import { describe, it, expect } from "vitest";
import { canCoordinatorPerformAction } from "./coordinator-permissions";

describe("Event Coordinator Permission Enforcement", () => {
  it("should allow coordinator with permission on assigned venue", () => {
    const allowed = canCoordinatorPerformAction(
      {
        role: "coordinator",
        isOrganizationOwner: false,
        assignedVenueIds: ["v-100"],
        permissions: ["manage_assigned_calendars"],
      },
      "manage_assigned_calendars",
      "v-100",
    );
    expect(allowed).toBe(true);
  });

  it("should deny coordinator access to unassigned venues", () => {
    const allowed = canCoordinatorPerformAction(
      {
        role: "coordinator",
        isOrganizationOwner: false,
        assignedVenueIds: ["v-100"],
        permissions: ["manage_assigned_calendars"],
      },
      "manage_assigned_calendars",
      "v-999",
    );
    expect(allowed).toBe(false);
  });

  it("should deny when permission is not granted", () => {
    const allowed = canCoordinatorPerformAction(
      {
        role: "coordinator",
        isOrganizationOwner: false,
        assignedVenueIds: ["v-100"],
        permissions: ["view_assigned_bookings"],
      },
      "manage_booking_decisions",
      "v-100",
    );
    expect(allowed).toBe(false);
  });

  it("should allow organization owners regardless of permission list", () => {
    const allowed = canCoordinatorPerformAction(
      {
        role: "coordinator",
        isOrganizationOwner: true,
        assignedVenueIds: [],
        permissions: [],
      },
      "manage_booking_decisions",
    );
    expect(allowed).toBe(true);
  });
});
