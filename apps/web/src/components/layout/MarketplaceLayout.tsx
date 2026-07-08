"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
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
      <header className="sticky top-0 z-50 shrink-0 bg-white">
        <MarketingNavbar
          embedded
          user={user ?? null}
          profile={profile ?? null}
        />
        <CustomerNavbar
          variant="subnav"
          user={user ?? null}
          profile={profile ?? null}
        />
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
