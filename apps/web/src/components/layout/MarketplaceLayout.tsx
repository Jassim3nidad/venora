"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  isAccountCenterRoute,
  isMarketplaceRoute,
} from "@/src/lib/is-marketplace-route";

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
  const showAccountTopNav = isAccountCenterRoute(pathname);

  if (!showMarketplaceSubnav && !showAccountTopNav) {
    return <>{children}</>;
  }

  return (
    <div
      data-testid="marketplace-shell"
      className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#111827]"
    >
      <div className="sticky top-0 z-50 shrink-0">
        <MarketingNavbar embedded mobileContext="marketplace" />
        {showMarketplaceSubnav ? (
          <CustomerNavbar
            user={user ?? null}
            profile={profile ?? null}
            variant="subnav"
          />
        ) : null}
      </div>
      {showMarketplaceSubnav ? (
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      )}
      {showMarketplaceSubnav ? <SiteFooter /> : null}
    </div>
  );
}
