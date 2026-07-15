import type { ReactNode } from "react";
import { MarketplaceLayout } from "@/components/layout/MarketplaceLayout";
import { getCurrentAuthUser } from "@/lib/supabase/current-user";
import { getNavbarProfile } from "@/lib/get-navbar-profile";

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { supabase, user } = await getCurrentAuthUser();
  const profile = await getNavbarProfile(supabase, user?.id);

  return (
    <MarketplaceLayout user={user} profile={profile}>
      {children}
    </MarketplaceLayout>
  );
}
