export type EnterpriseRole =
  | "venue_owner"
  | "coordinator"
  | "supplier"
  | "admin";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: string;
};

export const ROLE_LABELS: Record<EnterpriseRole, string> = {
  venue_owner: "Venue Owner",
  coordinator: "Event Coordinator",
  supplier: "Supplier Portal",
  admin: "Platform Admin",
};

export const NAV_BY_ROLE: Record<EnterpriseRole, NavItem[]> = {
  venue_owner: [
    { label: "Overview", href: "/dashboard", icon: "dashboard" },
    { label: "My Venues", href: "/dashboard/bookings", icon: "apartment" },
    { label: "Bookings", href: "/dashboard/bookings", icon: "calendar_today" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
    { label: "Staff", href: "/dashboard/staff", icon: "group" },
    { label: "Settings", href: "/dashboard/packages", icon: "settings" },
  ],
  coordinator: [
    { label: "Overview", href: "/dashboard/coordinator", icon: "dashboard" },
    { label: "Bookings", href: "/dashboard/bookings", icon: "calendar_today" },
    { label: "Inventory", href: "/dashboard/packages", icon: "inventory_2" },
    { label: "Financials", href: "/dashboard/analytics", icon: "payments" },
    { label: "Team", href: "/dashboard/staff", icon: "group" },
    { label: "Settings", href: "/dashboard/calendar", icon: "settings" },
  ],
  supplier: [
    { label: "Overview", href: "/dashboard/supplier", icon: "dashboard" },
    { label: "Profile/Portfolio", href: "/dashboard/supplier", icon: "person" },
    { label: "Active Jobs", href: "/dashboard/supplier", icon: "event_available" },
    { label: "Inquiries", href: "/dashboard/supplier", icon: "mail", badge: "3" },
    { label: "Packages", href: "/dashboard/supplier", icon: "inventory_2" },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: "dashboard" },
    { label: "Approvals", href: "/admin/venues", icon: "rule" },
    { label: "User Management", href: "/admin/users", icon: "group" },
    { label: "Financials", href: "/admin/commissions", icon: "payments" },
    { label: "AI Settings", href: "/admin/reports", icon: "psychology" },
    { label: "System Audit", href: "/admin/reports", icon: "history_edu" },
  ],
};

export const SUPPLIER_PERFORMANCE_NAV: NavItem[] = [
  { label: "Earnings", href: "/dashboard/supplier", icon: "payments" },
  { label: "Reviews", href: "/dashboard/supplier", icon: "reviews" },
];
