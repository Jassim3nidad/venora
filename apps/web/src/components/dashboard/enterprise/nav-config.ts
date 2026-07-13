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
    { label: "Overview", href: "/dashboard/venue-owner", icon: "dashboard" },
    { label: "Venues", href: "/dashboard/venues", icon: "location_city" },
    { label: "Bookings", href: "/dashboard/bookings", icon: "calendar_month" },
    { label: "Calendar", href: "/dashboard/calendar", icon: "event" },
    { label: "Packages", href: "/dashboard/packages", icon: "inventory_2" },
    { label: "Staff", href: "/dashboard/staff", icon: "groups" },
    { label: "Reviews", href: "/dashboard/reviews", icon: "rate_review" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
  ],
  coordinator: [
    { label: "Overview", href: "/dashboard/coordinator", icon: "dashboard" },
    { label: "Events", href: "/dashboard/coordinator/events", icon: "celebration" },
    { label: "Venues", href: "/dashboard/coordinator/venues", icon: "location_city" },
    { label: "Suppliers", href: "/dashboard/coordinator/suppliers", icon: "storefront" },
    { label: "Reports", href: "/dashboard/coordinator/reports", icon: "assessment" },
  ],
  supplier: [
    { label: "Overview", href: "/dashboard/supplier", icon: "dashboard" },
    { label: "Business Profile", href: "/dashboard/supplier/profile", icon: "storefront" },
    { label: "Services", href: "/dashboard/supplier/services", icon: "design_services" },
    { label: "Inquiries", href: "/dashboard/supplier/inquiries", icon: "mail" },
    { label: "Quotes", href: "/dashboard/supplier/quotes", icon: "request_quote" },
    { label: "Availability", href: "/dashboard/supplier/calendar", icon: "calendar_month" },
    { label: "Portfolio", href: "/dashboard/supplier/portfolio", icon: "photo_library" },
    { label: "Reviews", href: "/dashboard/supplier/reviews", icon: "rate_review" },
    { label: "Jobs", href: "/dashboard/supplier/bookings", icon: "event_available" },
    { label: "Analytics", href: "/dashboard/supplier/analytics", icon: "trending_up" },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: "dashboard" },
    { label: "Applications", href: "/admin/applications", icon: "how_to_reg" },
    { label: "Venues", href: "/admin/venues", icon: "location_city" },
    { label: "Suppliers", href: "/admin/suppliers", icon: "storefront" },
    { label: "Reviews", href: "/admin/reviews", icon: "flag" },
    { label: "Users", href: "/admin/users", icon: "group" },
    { label: "Commissions", href: "/admin/commissions", icon: "payments" },
    { label: "Reports", href: "/admin/reports", icon: "assessment" },
  ],
};
