import type { ReactNode } from "react";
import { MarketplaceLayout } from "@/components/layout/MarketplaceLayout";
import { getCurrentAuthUser } from "@/lib/supabase/current-user";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { VenueComparisonBar } from "@/features/venues/ui/VenueComparisonBar";
import { AIConciergeWidget } from "@/features/ai/ui/AIConciergeWidget";

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
      <VenueComparisonBar />
      <AIConciergeWidget />
    </MarketplaceLayout>
  );
}
