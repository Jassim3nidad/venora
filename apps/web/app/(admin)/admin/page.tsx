import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import {
  AdminOverview,
  ADMIN_MODULES,
  NAV_BY_ROLE,
} from "@/components/dashboard/enterprise";
import { hasPermission } from "@/lib/rbac/admin-context";

export const metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { count: totalUsers },
    { count: pendingVenues },
    { count: supplierReviews },
    { count: pendingApplications },
    { data: recentVenues },
    { data: recentSuppliers },
    { data: recentActivityData },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("venues")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase
      .from("supplier_profiles")
      .select("id", { count: "exact", head: true })
      .eq("accreditation_status", "pending"),
    supabase
      .from("partner_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("venues")
      .select("id, name, status, organizations(name)")
      .in("status", ["pending_approval", "pending_review"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("supplier_profiles")
      .select("id, business_name, accreditation_status")
      .eq("accreditation_status", "pending")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at, actor_id")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const pendingReviews = [
    ...(recentVenues ?? []).map(
      (v: {
        id: string;
        name: string;
        organizations: { name: string } | null;
      }) => {
        const org = v.organizations;
        return {
          id: v.id,
          item: v.name,
          type: "Venue Listing",
          submittedBy: org?.name ?? "Venue Owner",
          status: "Pending Review",
        };
      },
    ),
    ...(recentSuppliers ?? []).map(
      (s: { id: string; business_name: string }) => ({
        id: s.id,
        item: s.business_name,
        type: "Supplier Profile",
        submittedBy: s.business_name,
        status: "Needs Verification",
      }),
    ),
  ];

  // Quick-link visibility is derived from the same NAV_BY_ROLE.admin
  // permission mapping the sidebar uses (app/(admin)/admin/layout.tsx) --
  // not a second, hand-maintained permission list. A module/link is shown
  // only if its corresponding nav item has no permission requirement, or
  // the current admin holds that permission.
  const permissionByHref = new Map(
    NAV_BY_ROLE.admin.map((item) => [item.href, item.permission as any]),
  );
  async function hrefVisible(href: string): Promise<boolean> {
    const permission = permissionByHref.get(href);
    return !permission || hasPermission(permission);
  }

  const [canReviewApplications, canReviewVenues, moduleVisibility] =
    await Promise.all([
      hrefVisible("/admin/applications"),
      hrefVisible("/admin/venues"),
      Promise.all(
        ADMIN_MODULES.map(
          async (mod) => [mod.href, await hrefVisible(mod.href)] as const,
        ),
      ),
    ]);
  const visibleModuleHrefs = moduleVisibility
    .filter(([, visible]) => visible)
    .map(([href]) => href);

  return (
    <AdminOverview
      totalUsers={totalUsers ?? 0}
      pendingVenues={pendingVenues ?? 0}
      supplierReviews={supplierReviews ?? 0}
      pendingApplications={pendingApplications ?? 0}
      pendingReviews={pendingReviews}
      recentActivity={recentActivityData ?? []}
      visibleModuleHrefs={visibleModuleHrefs}
      canReviewApplications={canReviewApplications}
      canReviewVenues={canReviewVenues}
    />
  );
}
