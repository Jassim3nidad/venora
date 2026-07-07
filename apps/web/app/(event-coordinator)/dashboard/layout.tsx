import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { EnterpriseShell } from "@/components/dashboard/enterprise";

export default async function CoordinatorDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/dashboard/coordinator");

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
