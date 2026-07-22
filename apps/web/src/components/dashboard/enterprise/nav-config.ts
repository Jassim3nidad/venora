import type { AdminPermission } from "@/lib/rbac/permissions";

export type EnterpriseRole =
  "venue_owner" | "coordinator" | "supplier" | "admin";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  /**
   * Admin nav only: the permission required to see this item. Undefined
   * means "visible to any admin-role account" (the pre-existing default).
   * This only hides the link — the destination page/action still enforces
   * the same permission server-side; see EnterpriseShell's navItems prop
   * and app/(admin)/admin/layout.tsx for where this is applied.
   */
  permission?: AdminPermission;
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
    { label: "Business Profile", href: "/dashboard/business-profile", icon: "storefront" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
  ],
  coordinator: [
    { label: "Overview", href: "/dashboard/coordinator", icon: "dashboard" },
    {
      label: "Events",
      href: "/dashboard/coordinator/events",
      icon: "celebration",
    },
    {
      label: "Calendar",
      href: "/dashboard/coordinator/calendar",
      icon: "event",
    },
    {
      label: "Venues",
      href: "/dashboard/coordinator/venues",
      icon: "location_city",
    },
    {
      label: "Suppliers",
      href: "/dashboard/coordinator/suppliers",
      icon: "storefront",
    },
    {
      label: "Reports",
      href: "/dashboard/coordinator/reports",
      icon: "assessment",
    },
  ],
  supplier: [
    { label: "Overview", href: "/dashboard/supplier", icon: "dashboard" },
    {
      label: "Business Profile",
      href: "/dashboard/supplier/profile",
      icon: "storefront",
    },
    {
      label: "Services",
      href: "/dashboard/supplier/services",
      icon: "design_services",
    },
    { label: "Inquiries", href: "/dashboard/supplier/inquiries", icon: "mail" },
    {
      label: "Quotes",
      href: "/dashboard/supplier/quotes",
      icon: "request_quote",
    },
    {
      label: "Calendar",
      href: "/dashboard/supplier/calendar",
      icon: "calendar_month",
    },
    {
      label: "Portfolio",
      href: "/dashboard/supplier/portfolio",
      icon: "photo_library",
    },
    {
      label: "Reviews",
      href: "/dashboard/supplier/reviews",
      icon: "rate_review",
    },
    {
      label: "Jobs",
      href: "/dashboard/supplier/bookings",
      icon: "event_available",
    },
    {
      label: "Analytics",
      href: "/dashboard/supplier/analytics",
      icon: "trending_up",
    },
  ],
  admin: [
    {
      label: "Overview",
      href: "/admin",
      icon: "dashboard",
      permission: "admin.dashboard.view",
    },
    {
      label: "Applications",
      href: "/admin/applications",
      icon: "how_to_reg",
      permission: "users.verify",
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: "group",
      permission: "users.view",
    },
    {
      label: "Venues",
      href: "/admin/venues",
      icon: "location_city",
      permission: "venues.view",
    },
    {
      label: "Suppliers",
      href: "/admin/suppliers",
      icon: "storefront",
      permission: "suppliers.view",
    },
    {
      label: "Bookings",
      href: "/admin/bookings",
      icon: "calendar_month",
      permission: "marketplace.view",
    },
    {
      label: "Inquiries",
      href: "/admin/inquiries",
      icon: "mail",
      permission: "marketplace.view",
    },
    {
      label: "Reviews",
      href: "/admin/reviews",
      icon: "flag",
      permission: "marketplace.moderate",
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: "assessment",
      permission: "reports.view",
    },
    {
      label: "Disputes",
      href: "/admin/disputes",
      icon: "gavel",
      permission: "reports.view",
    },
    {
      label: "Commissions",
      href: "/admin/commissions",
      icon: "payments",
      permission: "commissions.view",
    },
    {
      label: "Marketplace",
      href: "/admin/marketplace",
      icon: "storefront",
      permission: "marketplace.view",
    },
    {
      label: "AI Configuration",
      href: "/admin/ai-configuration",
      icon: "smart_toy",
      permission: "ai_config.view",
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: "settings",
      permission: "system_settings.view",
    },
    {
      label: "Administrators",
      href: "/admin/administrators",
      icon: "admin_panel_settings",
      permission: "admin_accounts.view",
    },
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: "history",
      permission: "audit_logs.view",
    },
  ],
};
