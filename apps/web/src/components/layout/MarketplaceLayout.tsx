"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { isMarketplaceRoute } from "@/src/lib/is-marketplace-route";

interface MarketplaceLayoutProps {
  children: ReactNode;
  user?: { email?: string | null } | null;
  profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export function MarketplaceLayout({
  children,
  user,
  profile,
}: MarketplaceLayoutProps) {
  const pathname = usePathname();
  const showMarketplaceSubnav = isMarketplaceRoute(pathname);

  if (!showMarketplaceSubnav) {
    return <>{children}</>;
  }

  return (
    <div
      data-testid="marketplace-shell"
      className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#111827]"
    >
      <div className="sticky top-0 z-50 shrink-0">
        <MarketingNavbar embedded />
        {showMarketplaceSubnav ? (
          <CustomerNavbar
            user={user ?? null}
            profile={profile ?? null}
            variant="subnav"
          />
        ) : null}
      </div>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      {showMarketplaceSubnav ? <SiteFooter /> : null}
    </div>
  );
}
