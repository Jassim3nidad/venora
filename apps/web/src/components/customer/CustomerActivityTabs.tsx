import Link from "next/link";
import { CalendarDays, Mail } from "lucide-react";
import { getCustomerActivityHref } from "@/src/features/suppliers/application/customer-inquiry.logic";

type ActivityTab = {
  label: string;
  href: string;
  value: "bookings" | "inquiries";
  icon: typeof CalendarDays;
};

const tabs: ActivityTab[] = [
  {
    label: "Venue Bookings",
    href: getCustomerActivityHref("venue-bookings"),
    value: "bookings",
    icon: CalendarDays,
  },
  {
    label: "Supplier Inquiries",
    href: getCustomerActivityHref("supplier-inquiries"),
    value: "inquiries",
    icon: Mail,
  },
];

export function CustomerActivityTabs({
  active,
}: {
  active: ActivityTab["value"];
}) {
  return (
    <section
      aria-label="My Activity"
      className="rounded-[24px] border border-[#E5E7EB] bg-white p-2 shadow-sm shadow-slate-200/60"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.value;

          return (
            <Link
              key={tab.value}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold transition",
                isActive
                  ? "bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/20"
                  : "text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
