"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Package,
  Settings,
  Truck,
  UsersRound,
} from "lucide-react";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Venues",
    href: "/dashboard/venues",
    icon: Building2,
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    icon: CalendarDays,
  },
  {
    label: "Packages",
    href: "/dashboard/packages",
    icon: Package,
  },
  {
    label: "Staff",
    href: "/dashboard/staff",
    icon: UsersRound,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
];

type DashboardShellProps = {
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
};

export function DashboardShell({
  title,
  description,
  badge,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <main className="flex min-h-screen bg-[#FFFDFC]">
      <aside className="hidden min-h-screen w-[280px] shrink-0 border-r border-[#E9D5D0] bg-white px-[20px] py-[24px] lg:block">
        <div className="mb-[32px]">
          <Link href="/" className="flex items-center gap-[10px]">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#FFF4F0] text-[#E07A5F]">
              <Truck className="h-[20px] w-[20px]" />
            </div>

            <div>
              <p className="text-[20px] font-extrabold leading-[26px] tracking-[-0.02em] text-[#191C1E]">
                Venora
              </p>
              <p className="text-[12px] font-medium text-[#88726D]">
                Dashboard
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-col gap-[8px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-[44px] items-center gap-[12px] rounded-[10px] px-[12px] text-[14px] font-bold transition ${
                  isActive
                    ? "bg-[#FFF4F0] text-[#E07A5F]"
                    : "text-[#55423E] hover:bg-[#FFF4F0] hover:text-[#E07A5F]"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-[32px] rounded-[16px] border border-[#E9D5D0] bg-[#FFFDFC] p-[16px]">
          <div className="mb-[10px] flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#FFF4F0] text-[#E07A5F]">
            <Settings className="h-[18px] w-[18px]" />
          </div>

          <p className="text-[14px] font-bold text-[#191C1E]">
            Dashboard Shell
          </p>

          <p className="mt-[4px] text-[12px] leading-[18px] text-[#55423E]">
            Ready for role-based routing once roles go live.
          </p>
        </div>
      </aside>

      <section className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-[#E9D5D0] bg-white px-[24px] py-[20px] lg:px-[40px]">
          {badge ? (
            <span className="mb-[8px] inline-flex rounded-full bg-[#FFF4F0] px-[10px] py-[4px] text-[12px] font-bold uppercase tracking-[0.08em] text-[#E07A5F]">
              {badge}
            </span>
          ) : null}

          <h1 className="text-[28px] font-extrabold leading-[36px] tracking-[-0.03em] text-[#191C1E]">
            {title}
          </h1>

          <p className="mt-[4px] max-w-[680px] text-[15px] leading-[23px] text-[#55423E]">
            {description}
          </p>
        </header>

        <div className="flex-1 px-[24px] py-[28px] lg:px-[40px]">
          {children}
        </div>
      </section>
    </main>
  );
}

type DashboardCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export function DashboardCard({
  title,
  description,
  icon,
}: DashboardCardProps) {
  return (
    <div className="rounded-[18px] border border-[#E9D5D0] bg-white p-[20px] shadow-sm">
      {icon ? (
        <div className="mb-[16px] flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#FFF4F0] text-[#E07A5F]">
          {icon}
        </div>
      ) : null}

      <h3 className="text-[17px] font-extrabold leading-[24px] text-[#191C1E]">
        {title}
      </h3>

      <p className="mt-[6px] text-[14px] leading-[22px] text-[#55423E]">
        {description}
      </p>
    </div>
  );
}