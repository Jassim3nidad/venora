import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/supabase/current-user";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { EnterpriseShell } from "@/components/dashboard/enterprise";
import { hasRole } from "@/lib/rbac/guards";
import { ROLES } from "@/lib/rbac/roles";

export default async function VenueOwnerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { supabase, user } = await getCurrentAuthUser();

  if (!user) redirect("/login?redirectTo=/dashboard");
  if (!(await hasRole(ROLES.VENUE_OWNER, ROLES.ADMIN)))
    redirect("/unauthorized");

  const profile = await getNavbarProfile(supabase, user.id);
  const userName =
    profile?.full_name || user.email?.split("@")[0] || "Venue Owner";

  return (
    <EnterpriseShell
      role="venue_owner"
      userName={userName}
      userEmail={user.email ?? ""}
      {...(profile?.avatar_url ? { userAvatar: profile.avatar_url } : {})}
    >
      {children}
    </EnterpriseShell>
  );
}
