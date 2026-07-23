export type CoordinatorPermissionAction =
  | "view_assigned_venues"
  | "manage_availability"
  | "view_bookings"
  | "update_operational_status"
  | "communicate_with_customers"
  | "manage_venue_suppliers";

export interface StaffRoleContext {
  role: "owner" | "coordinator" | "staff";
  isOrganizationOwner: boolean;
  assignedVenueIds: string[];
}

export function canCoordinatorPerformAction(
  context: StaffRoleContext,
  action: CoordinatorPermissionAction,
  venueId?: string
): boolean {
  if (context.isOrganizationOwner || context.role === "owner") {
    return true;
  }

  if (context.role !== "coordinator") {
    return false;
  }

  // Restrict to assigned venues if venueId is specified
  if (venueId && !context.assignedVenueIds.includes(venueId)) {
    return false;
  }

  switch (action) {
    case "view_assigned_venues":
    case "manage_availability":
    case "view_bookings":
    case "update_operational_status":
    case "communicate_with_customers":
    case "manage_venue_suppliers":
      return true;
    default:
      return false;
  }
}
