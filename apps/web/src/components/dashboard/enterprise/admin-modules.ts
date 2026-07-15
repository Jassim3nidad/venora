// Plain data, deliberately NOT in a "use client" module -- Server Components
// (app/(admin)/admin/page.tsx) need to .map()/.filter() this array directly,
// which breaks if it's exported from a client-component file (React Server
// Components wrap client-module exports in reference proxies, not the real
// values). AdminOverview.tsx (client) imports it from here too, so there's
// still exactly one definition.
export type AdminModule = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

export const ADMIN_MODULES: AdminModule[] = [
  {
    title: "Partner Applications",
    description:
      "Approve or deny applications for venue owner, coordinator, and supplier roles.",
    href: "/admin/applications",
    icon: "how_to_reg",
  },
  {
    title: "User Management",
    description: "Review users, manage roles, and monitor platform access.",
    href: "/admin/users",
    icon: "group",
  },
  {
    title: "Venue Approval",
    description: "Approve, reject, and review venue listings.",
    href: "/admin/venues",
    icon: "location_city",
  },
  {
    title: "Supplier Accreditation",
    description: "Review supplier profiles and accreditation status.",
    href: "/admin/suppliers",
    icon: "storefront",
  },
  {
    title: "Commission Tracking",
    description: "Monitor platform fees and payout summaries.",
    href: "/admin/commissions",
    icon: "payments",
  },
  {
    title: "Reports",
    description: "Platform analytics, booking trends, and activity.",
    href: "/admin/reports",
    icon: "assessment",
  },
];
