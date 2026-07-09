"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_NAV_ITEMS } from "./nav-items";
import { isAccountNavItemActive } from "./account-nav-utils";

/**
 * Desktop sidebar navigation for the Account Center.
 * On mobile, categories are accessed via `AccountMobileMenu`'s burger drawer instead.
 */
export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account settings"
      className="hidden lg:sticky lg:top-8 lg:block"
    >
      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB]/80 bg-white p-2 shadow-sm shadow-slate-200/60">
        {ACCOUNT_NAV_ITEMS.map((item) => {
          const isActive = isAccountNavItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 rounded-2xl px-4 py-3 transition ${
                isActive
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-slate-600 hover:bg-[#F9FAFB] hover:text-[#2563EB]"
              }`}
            >
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isActive
                    ? "bg-[#2563EB] text-white"
                    : "bg-[#F9FAFB] text-[#6B7280]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0">
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
