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
    <main className="flex min-h-screen bg-[#F9FAFB]">
      <aside className="hidden min-h-screen w-[280px] shrink-0 border-r border-[#E5E7EB] bg-white px-[20px] py-[24px] lg:block">
        <div className="mb-[32px]">
          <Link href="/" className="flex items-center gap-[10px]">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#EFF6FF] text-[#2563EB]">
              <Truck className="h-[20px] w-[20px]" />
            </div>

            <div>
              <p className="text-[20px] font-extrabold leading-[26px] tracking-[-0.02em] text-[#111827]">
                Venora
              </p>
              <p className="text-[12px] font-medium text-[#6B7280]">
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
                    ? "bg-[#EFF6FF] text-[#2563EB]"
                    : "text-[#4B5563] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-[32px] rounded-[16px] border border-[#E5E7EB] bg-[#F9FAFB] p-[16px]">
          <div className="mb-[10px] flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#EFF6FF] text-[#2563EB]">
            <Settings className="h-[18px] w-[18px]" />
          </div>

          <p className="text-[14px] font-bold text-[#111827]">
            Dashboard Shell
          </p>

          <p className="mt-[4px] text-[12px] leading-[18px] text-[#4B5563]">
            Ready for role-based routing once roles go live.
          </p>
        </div>
      </aside>

      <section className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-[#E5E7EB] bg-white px-[24px] py-[20px] lg:px-[40px]">
          {badge ? (
            <span className="mb-[8px] inline-flex rounded-full bg-[#EFF6FF] px-[10px] py-[4px] text-[12px] font-bold uppercase tracking-[0.08em] text-[#2563EB]">
              {badge}
            </span>
          ) : null}

          <h1 className="text-[28px] font-extrabold leading-[36px] tracking-[-0.03em] text-[#111827]">
            {title}
          </h1>

          <p className="mt-[4px] max-w-[680px] text-[15px] leading-[23px] text-[#4B5563]">
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
    <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-[20px] shadow-sm">
      {icon ? (
        <div className="mb-[16px] flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#EFF6FF] text-[#2563EB]">
          {icon}
        </div>
      ) : null}

      <h3 className="text-[17px] font-extrabold leading-[24px] text-[#111827]">
        {title}
      </h3>

      <p className="mt-[6px] text-[14px] leading-[22px] text-[#4B5563]">
        {description}
      </p>
    </div>
  );
}