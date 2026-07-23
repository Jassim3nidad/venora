import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/supabase/current-user";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { EnterpriseShell, NAV_BY_ROLE } from "@/components/dashboard/enterprise";
import { hasRole } from "@/lib/rbac/guards";
import { ROLES } from "@/lib/rbac/roles";

import {
  getOwnerDashboardContext,
  hasCoordinatorPermission,
} from "@/lib/dashboard/org-dashboard-data";
import type { CoordinatorPermission } from "@/lib/rbac/coordinator-permissions";

export default async function VenueOwnerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { supabase, user } = await getCurrentAuthUser();

  if (!user) redirect("/login?redirectTo=/dashboard");
  
  const isVenueOwner = await hasRole(ROLES.VENUE_OWNER);
  const isCoordinator = await hasRole(ROLES.EVENT_COORDINATOR);
  const isAdmin = await hasRole(ROLES.ADMIN);

  if (!isVenueOwner && !isCoordinator && !isAdmin) {
    // Allow coordinators with only a pending invitation through (they see the invite card)
    const { data: pendingInvitation } = await supabase
      .from("organization_member_invitations")
      .select("id")
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (!pendingInvitation) {
      redirect("/unauthorized");
    }
  }

  const profile = await getNavbarProfile(supabase, user.id);
  const userName =
    profile?.full_name || 
    user.email?.split("@")[0] || 
    (isCoordinator && !isVenueOwner && !isAdmin ? "Event Coordinator" : "Venue Owner");

  const shellRole = (isCoordinator && !isVenueOwner && !isAdmin) ? "coordinator" : "venue_owner";

  let navItems = undefined;
  if (isCoordinator && !isVenueOwner && !isAdmin) {
    try {
      const context = await getOwnerDashboardContext();
      
      navItems = (
        await Promise.all(
          NAV_BY_ROLE.coordinator.map(async (item) =>
            !item.permission || hasCoordinatorPermission(item.permission as CoordinatorPermission, context)
              ? item
              : null,
          ),
        )
      ).filter((item): item is (typeof NAV_BY_ROLE.coordinator)[number] => item !== null);
    } catch {
      // non-fatal
    }
  }

  return (
    <EnterpriseShell
      role={shellRole}
      userName={userName}
      userEmail={user.email ?? ""}
      {...(navItems ? { navItems } : {})}
      {...(profile?.avatar_url ? { userAvatar: profile.avatar_url } : {})}
    >
      {children}
    </EnterpriseShell>
  );
}
