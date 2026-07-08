import type { ReactNode } from "react";
import { MarketplaceLayout } from "@/components/layout/MarketplaceLayout";
import { createClient } from "@/lib/supabase/server";
import { getNavbarProfile } from "@/lib/get-navbar-profile";

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getNavbarProfile(supabase, user?.id);

  return (
    <MarketplaceLayout user={user} profile={profile}>
      {children}
    </MarketplaceLayout>
  );
}