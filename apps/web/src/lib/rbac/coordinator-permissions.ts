export const COORDINATOR_PERMISSIONS = [
  "view_assigned_venues",
  "manage_assigned_venue_listings",
  "view_assigned_bookings",
  "coordinate_assigned_bookings",
  "manage_booking_decisions",
  "view_assigned_calendars",
  "manage_assigned_calendars",
  "message_assigned_customers",
  "view_accredited_suppliers",
  "coordinate_accredited_suppliers",
  "view_supplier_coordination",
  "message_coordinated_suppliers",
  "manage_supplier_coordination_schedule",
  "manage_supplier_coordination_notes",
  "report_supplier_coordination_issues",
  "view_booking_performance",
  "generate_operational_reports",
] as const;

export type CoordinatorPermission = (typeof COORDINATOR_PERMISSIONS)[number];

export const COORDINATOR_PERMISSION_LABELS: Record<
  CoordinatorPermission,
  string
> = {
  view_assigned_venues: "View assigned venues",
  manage_assigned_venue_listings: "Manage assigned venue listings",
  view_assigned_bookings: "View assigned bookings",
  coordinate_assigned_bookings: "Coordinate assigned bookings",
  manage_booking_decisions: "Approve or decline bookings",
  view_assigned_calendars: "View assigned calendars",
  manage_assigned_calendars: "Manage assigned calendars",
  message_assigned_customers: "Message assigned customers",
  view_accredited_suppliers: "View accredited suppliers",
  coordinate_accredited_suppliers: "Coordinate accredited suppliers",
  view_supplier_coordination: "View supplier coordination",
  message_coordinated_suppliers: "Message coordinated suppliers",
  manage_supplier_coordination_schedule: "Manage supplier schedules",
  manage_supplier_coordination_notes: "Manage supplier notes",
  report_supplier_coordination_issues: "Report supplier issues",
  view_booking_performance: "View booking performance",
  generate_operational_reports: "Generate operational reports",
};

export const DEFAULT_COORDINATOR_PERMISSIONS: CoordinatorPermission[] = [
  "view_assigned_venues",
  "manage_assigned_venue_listings",
  "view_assigned_bookings",
  "coordinate_assigned_bookings",
  "view_assigned_calendars",
  "message_assigned_customers",
  "view_accredited_suppliers",
  "coordinate_accredited_suppliers",
  "view_supplier_coordination",
  "message_coordinated_suppliers",
  "manage_supplier_coordination_schedule",
  "manage_supplier_coordination_notes",
  "report_supplier_coordination_issues",
  "view_booking_performance",
  "generate_operational_reports",
];

const PERMISSION_SET = new Set<string>(COORDINATOR_PERMISSIONS);

export function isCoordinatorPermission(
  value: string,
): value is CoordinatorPermission {
  return PERMISSION_SET.has(value);
}

export function sanitizeCoordinatorPermissions(
  permissions: string[] | null | undefined,
  fallback: CoordinatorPermission[] = DEFAULT_COORDINATOR_PERMISSIONS,
): CoordinatorPermission[] {
  if (!permissions || permissions.length === 0) {
    return [...fallback];
  }

  const unique = [
    ...new Set(
      permissions.filter(isCoordinatorPermission),
    ),
  ];

  return unique.length > 0 ? unique : [...fallback];
}
