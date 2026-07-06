"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronRight, LogOut, Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@venora/ui";
import { ACCOUNT_NAV_ITEMS } from "./nav-items";

/**
 * Mobile-only burger menu for the Account Center. Opens a left-side drawer
 * (Airbnb-style) listing the account categories, plus quick links back to
 * the marketplace and to sign out — both of which live inline in the
 * desktop header but are tucked in here on small screens to keep the
 * mobile top bar compact.
 */
export default function AccountMobileMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const activeItem = ACCOUNT_NAV_ITEMS.find((item) => item.href === pathname);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-3 lg:hidden">
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Open account menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-slate-700 shadow-sm transition hover:border-[#2563EB]/40 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
          >
            <Menu className="h-5 w-5" />
          </button>
        </DialogTrigger>

        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
            Account center
          </p>
          <p className="truncate text-sm font-black text-slate-950">
            {activeItem?.label ?? "Menu"}
          </p>
        </div>
      </div>

      <DialogContent
        className={
          "fixed inset-y-0 left-0 right-auto top-0 z-50 grid h-full w-[86%] max-w-[340px] " +
          "translate-x-0 translate-y-0 grid-rows-[auto_1fr] gap-0 overflow-y-auto rounded-none " +
          "border-y-0 border-l-0 p-0 shadow-2xl " +
          "data-[state=open]:animate-drawer-in data-[state=closed]:animate-drawer-out"
        }
      >
        <DialogTitle className="sr-only">Account menu</DialogTitle>

        <div className="border-b border-[#E5E7EB]/80 px-5 py-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
            Venora account center
          </div>
          <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-slate-950">
            Account Center
          </h2>
        </div>

        <div className="flex flex-col justify-between overflow-y-auto p-3">
          <div className="space-y-1">
            <Link
              href="/venues"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#2563EB]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F9FAFB] text-[#6B7280]">
                <ArrowLeft className="h-4 w-4" />
              </div>
              Back to Venues
            </Link>

            <div className="my-2 border-t border-[#E5E7EB]/80" />

            {ACCOUNT_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
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

          <div className="mt-2 border-t border-[#E5E7EB]/80 pt-2">
            <Link
              href="/logout"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <LogOut className="h-4 w-4" />
              </div>
              Sign Out
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
