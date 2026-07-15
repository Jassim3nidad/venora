import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { EnterpriseShell } from "@/components/dashboard/enterprise";
import { hasRole } from "@/lib/rbac/guards";
import { ROLES } from "@/lib/rbac/roles";

export default async function SupplierDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/dashboard/supplier");
  if (!(await hasRole(ROLES.SUPPLIER, ROLES.ADMIN))) redirect("/unauthorized");

  const profile = await getNavbarProfile(supabase, user.id);
  const userName =
    profile?.full_name || user.email?.split("@")[0] || "Supplier";

  return (
    <EnterpriseShell
      role="supplier"
      userName={userName}
      userEmail={user.email ?? ""}
      {...(profile?.avatar_url ? { userAvatar: profile.avatar_url } : {})}
    >
      {children}
    </EnterpriseShell>
  );
}
