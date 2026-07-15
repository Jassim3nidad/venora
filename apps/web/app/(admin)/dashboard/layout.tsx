import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { EnterpriseShell } from "@/components/dashboard/enterprise";
import { hasRole } from "@/lib/rbac/guards";
import { ROLES } from "@/lib/rbac/roles";

/**
 * Covers legacy /dashboard/admin URLs (a re-export shim of /admin outside
 * the (admin)/admin/ route tree) so it gets the same EnterpriseShell chrome
 * as every other dashboard route instead of rendering with no navigation.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/dashboard/admin");
  if (!(await hasRole(ROLES.ADMIN))) redirect("/unauthorized");

  const profile = await getNavbarProfile(supabase, user.id);
  const userName =
    profile?.full_name || user.email?.split("@")[0] || "Administrator";

  return (
    <EnterpriseShell
      role="admin"
      userName={userName}
      userEmail={user.email ?? ""}
      {...(profile?.avatar_url ? { userAvatar: profile.avatar_url } : {})}
    >
      {children}
    </EnterpriseShell>
  );
}
