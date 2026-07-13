"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
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

  if (!isMarketplaceRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FAFC] text-[#111827]">
      <MarketingNavbar embedded={Boolean(user)} />
      {user ? (
        <CustomerNavbar
          user={user}
          profile={profile ?? null}
          variant="subnav"
        />
      ) : null}

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
