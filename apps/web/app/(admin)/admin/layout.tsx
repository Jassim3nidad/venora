import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import {
  EnterpriseShell,
  NAV_BY_ROLE,
} from "@/components/dashboard/enterprise";
import { hasPermission } from "@/lib/rbac/admin-context";
import { hasRole } from "@/lib/rbac/guards";
import { ROLES } from "@/lib/rbac/roles";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/admin");
  if (!(await hasRole(ROLES.ADMIN))) redirect("/unauthorized");

  const profile = await getNavbarProfile(supabase, user.id);
  const userName =
    profile?.full_name || user.email?.split("@")[0] || "Administrator";

  // Nav visibility is UX only (middleware + requirePermission() on every
  // page/action are the actual security boundary) — but hiding links this
  // tier can't use anyway keeps the sidebar honest per Phase 16's
  // permission-aware navigation requirement.
  const navItems = (
    await Promise.all(
      NAV_BY_ROLE.admin.map(async (item) =>
        !item.permission || (await hasPermission(item.permission))
          ? item
          : null,
      ),
    )
  ).filter((item): item is (typeof NAV_BY_ROLE.admin)[number] => item !== null);

  return (
    <EnterpriseShell
      role="admin"
      userName={userName}
      userEmail={user.email ?? ""}
      navItems={navItems}
      {...(profile?.avatar_url ? { userAvatar: profile.avatar_url } : {})}
    >
      {children}
    </EnterpriseShell>
  );
}
