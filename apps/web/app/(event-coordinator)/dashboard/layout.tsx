import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/supabase/current-user";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { EnterpriseShell } from "@/components/dashboard/enterprise";
import { hasRole } from "@/lib/rbac/guards";
import { ROLES } from "@/lib/rbac/roles";

export default async function CoordinatorDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { supabase, user } = await getCurrentAuthUser();

  if (!user) redirect("/login?redirectTo=/dashboard/coordinator");
  const isAdmin = await hasRole(ROLES.ADMIN);

  if (!isAdmin) {
    const { data: activeMembership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("role", "coordinator")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!activeMembership) {
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
  }

  const profile = await getNavbarProfile(supabase, user.id);
  const userName =
    profile?.full_name || user.email?.split("@")[0] || "Event Coordinator";

  return (
    <EnterpriseShell
      role="coordinator"
      userName={userName}
      userEmail={user.email ?? ""}
      {...(profile?.avatar_url ? { userAvatar: profile.avatar_url } : {})}
    >
      {children}
    </EnterpriseShell>
  );
}
