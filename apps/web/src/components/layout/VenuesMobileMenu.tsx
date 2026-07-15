"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  ChevronRight,
  Compass,
  Heart,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@venora/ui";

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/venues",
    label: "Venues",
    description: "Discover venues for your event",
    icon: Compass,
  },
  {
    href: "/bookings",
    label: "Bookings",
    description: "Track your booking requests",
    icon: CalendarCheck,
  },
  {
    href: "/favorites",
    label: "Favorites",
    description: "Venues you've saved",
    icon: Heart,
  },
];

function isNavItemActive(pathname: string, href: string) {
  if (href === "/venues") {
    return pathname === "/venues" || pathname.startsWith("/venues/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile-only burger menu for the venues browse and venue detail pages.
 * Mirrors the Account Center's burger drawer design (left slide-in panel,
 * icon + label + description rows, active-state highlighting). Account
 * and logout actions live in the profile-photo dropdown instead.
 */
export default function VenuesMobileMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1D4ED8] transition hover:bg-[#EFF6FF] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DialogTrigger>

      <DialogContent
        className={
          "fixed inset-y-0 left-0 right-auto top-0 z-50 grid h-full w-[86%] max-w-[340px] " +
          "translate-x-0 translate-y-0 grid-rows-[auto_1fr] gap-0 overflow-y-auto rounded-none " +
          "border-y-0 border-l-0 p-0 shadow-2xl " +
          "data-[state=open]:animate-drawer-in data-[state=closed]:animate-drawer-out"
        }
      >
        <DialogTitle className="sr-only">Venora menu</DialogTitle>

        <div className="border-b border-[#E5E7EB]/80 px-5 py-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
            Venora marketplace
          </div>
          <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-slate-950">
            Menu
          </h2>
        </div>

        <div className="flex flex-col overflow-y-auto p-3">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                    isActive
                      ? "bg-[#EFF6FF] text-[#2563EB]"
                      : "text-slate-600 hover:bg-[#F9FAFB] hover:text-[#2563EB]"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-[#2563EB] text-white"
                        : "bg-[#F9FAFB] text-[#6B7280]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold leading-5">
                      {item.label}
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-medium leading-4 ${
                        isActive ? "text-[#2563EB]/70" : "text-slate-400"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>

                  <ChevronRight
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-[#2563EB]" : "text-slate-300"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
