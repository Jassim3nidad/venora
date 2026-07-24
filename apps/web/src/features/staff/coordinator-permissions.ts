import type { CoordinatorPermission } from "@/src/lib/rbac/coordinator-permissions";

export interface StaffRoleContext {
  role: "owner" | "coordinator" | "staff";
  isOrganizationOwner: boolean;
  assignedVenueIds: string[];
  permissions?: CoordinatorPermission[];
}

/**
 * Venue-scoped check used by unit tests and staff helpers.
 * Product gates use `hasCoordinatorPermission` / `requireCoordinatorPermission`.
 */
export function canCoordinatorPerformAction(
  context: StaffRoleContext,
  permission: CoordinatorPermission,
  venueId?: string,
): boolean {
  if (context.isOrganizationOwner || context.role === "owner") {
    return true;
  }

  if (context.role !== "coordinator") {
    return false;
  }

  if (venueId && !context.assignedVenueIds.includes(venueId)) {
    return false;
  }

  return (context.permissions ?? []).includes(permission);
}
