import { describe, it, expect } from "vitest";
import {
  sanitizeCoordinatorPermissions,
  isCoordinatorPermission,
} from "@/src/lib/rbac/coordinator-permissions";

describe("sanitizeCoordinatorPermissions", () => {
  it("keeps only known coordinator permissions", () => {
    expect(
      sanitizeCoordinatorPermissions([
        "view_assigned_bookings",
        "not_a_real_permission",
        "manage_booking_decisions",
      ]),
    ).toEqual(["view_assigned_bookings", "manage_booking_decisions"]);
  });

  it("falls back to defaults when empty", () => {
    const result = sanitizeCoordinatorPermissions([]);
    expect(result).toContain("view_assigned_venues");
    expect(result).not.toContain("manage_booking_decisions");
  });

  it("rejects unknown permission strings", () => {
    expect(isCoordinatorPermission("manage_booking_decisions")).toBe(true);
    expect(isCoordinatorPermission("manage_clients")).toBe(false);
  });
});
