"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Lock, Receipt, UserRound, Building2 } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/account",
    label: "Personal Information",
    description: "Profile, contact details, and password",
    icon: UserRound,
  },
  {
    href: "/account/payments",
    label: "Payments and Payouts",
    description: "Saved payment methods",
    icon: CreditCard,
  },
  {
    href: "/account/transactions",
    label: "Transactions",
    description: "Your booking payment history",
    icon: Receipt,
  },
  {
    href: "/account/privacy",
    label: "Privacy and Sharing",
    description: "Data and communication preferences",
    icon: Lock,
  },
  {
    href: "/account/become-partner",
    label: "Become a Partner",
    description: "Apply for a Vendor workspace",
    icon: Building2,
  },
] as const;

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account settings" className="lg:sticky lg:top-8">
      {/* Mobile: horizontal scrollable pill nav */}
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition ${
                isActive
                  ? "border-[#2563EB]/50 bg-[#EFF6FF] text-[#2563EB]"
                  : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#2563EB]/30 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden overflow-hidden rounded-[24px] border border-[#E5E7EB]/80 bg-white p-2 shadow-sm shadow-slate-200/60 lg:block">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
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
