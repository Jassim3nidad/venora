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
    { label: "Bookings", href: "/dashboard/bookings", icon: "calendar_month" },
    { label: "Calendar", href: "/dashboard/calendar", icon: "event" },
    { label: "Packages", href: "/dashboard/packages", icon: "inventory_2" },
    { label: "Staff", href: "/dashboard/staff", icon: "groups" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
  ],
  coordinator: [
    { label: "Overview", href: "/dashboard/coordinator", icon: "dashboard" },
    { label: "Events", href: "/dashboard/coordinator", icon: "celebration" },
    { label: "Venues", href: "/dashboard/coordinator", icon: "location_city" },
    { label: "Suppliers", href: "/dashboard/coordinator", icon: "storefront" },
    { label: "Reports", href: "/dashboard/coordinator", icon: "assessment" },
  ],
  supplier: [
    { label: "Overview", href: "/dashboard/supplier", icon: "dashboard" },
    { label: "Services", href: "/dashboard/supplier", icon: "design_services" },
    { label: "Inquiries", href: "/dashboard/supplier", icon: "mail" },
    { label: "Bookings", href: "/dashboard/supplier", icon: "event_available" },
    { label: "Analytics", href: "/dashboard/supplier", icon: "trending_up" },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: "dashboard" },
    { label: "Venues", href: "/admin/venues", icon: "location_city" },
    { label: "Suppliers", href: "/admin/suppliers", icon: "storefront" },
    { label: "Users", href: "/admin/users", icon: "group" },
    { label: "Commissions", href: "/admin/commissions", icon: "payments" },
    { label: "Reports", href: "/admin/reports", icon: "assessment" },
  ],
};
