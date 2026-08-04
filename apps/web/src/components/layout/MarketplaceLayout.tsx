"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  isAccountCenterRoute,
  isImmersiveVenueProfileRoute,
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
  const immersiveVenueProfile = isImmersiveVenueProfileRoute(pathname);
  const [immersiveNavScrolled, setImmersiveNavScrolled] = useState(false);

  useEffect(() => {
    if (!immersiveVenueProfile) {
      setImmersiveNavScrolled(false);
      return;
    }

    let mutationObserver: MutationObserver | null = null;
    let animationFrame: number | null = null;
    let detachScrollState: (() => void) | null = null;

    const observeHero = () => {
      const hero = document.querySelector("[data-immersive-venue-hero]");
      if (!hero) return false;

      let triggerPoint = Math.max(160, hero.clientHeight * 0.72);
      const updateState = () => {
        animationFrame = null;
        setImmersiveNavScrolled(window.scrollY >= triggerPoint);
      };
      const handleScroll = () => {
        if (animationFrame !== null) return;
        animationFrame = window.requestAnimationFrame(updateState);
      };
      const handleResize = () => {
        triggerPoint = Math.max(160, hero.clientHeight * 0.72);
        handleScroll();
      };

      updateState();
      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleResize);
      detachScrollState = () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleResize);
        if (animationFrame !== null)
          window.cancelAnimationFrame(animationFrame);
      };
      return true;
    };

    if (!observeHero()) {
      mutationObserver = new MutationObserver(() => {
        if (!observeHero()) return;
        mutationObserver?.disconnect();
        mutationObserver = null;
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      mutationObserver?.disconnect();
      detachScrollState?.();
    };
  }, [immersiveVenueProfile]);

  if (!showMarketplaceSubnav && !showAccountTopNav) {
    return <>{children}</>;
  }

  return (
    <div
      data-testid="marketplace-shell"
      className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#111827]"
    >
      <div
        data-immersive-navbar-shell={immersiveVenueProfile || undefined}
        className={
          immersiveVenueProfile
            ? "fixed inset-x-0 top-0 z-50 shrink-0"
            : "sticky top-0 z-50 shrink-0"
        }
      >
        <MarketingNavbar
          embedded
          mobileContext="marketplace"
          variant={immersiveVenueProfile ? "immersive" : "default"}
          scrolled={immersiveNavScrolled}
        />
        {showMarketplaceSubnav ? (
          <CustomerNavbar
            user={user ?? null}
            profile={profile ?? null}
            variant="subnav"
            appearance={immersiveVenueProfile ? "immersive" : "default"}
            scrolled={immersiveNavScrolled}
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
