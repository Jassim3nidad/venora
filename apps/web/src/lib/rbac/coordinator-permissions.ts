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

export type CoordinatorPermission = typeof COORDINATOR_PERMISSIONS[number];

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
