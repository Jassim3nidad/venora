import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import {
  CUSTOMER_BOOKING_STATUS_FILTERS,
  buildBookingsPageHref,
  type CustomerBookingStatusFilter,
} from "@/features/booking/constants/customer-booking-filters";
import { CustomerCard } from "@/src/components/customer/CustomerUI";

type BookingStatusFilterBarProps = {
  activeFilter: CustomerBookingStatusFilter;
  counts: Record<CustomerBookingStatusFilter, number>;
  query?: { created?: string; cancelled?: string };
};

export function BookingStatusFilterBar({
  activeFilter,
  counts,
  query,
}: BookingStatusFilterBarProps) {
  return (
    <CustomerCard className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
        <p className="text-sm font-extrabold text-slate-900">Filter by status</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CUSTOMER_BOOKING_STATUS_FILTERS.map((option) => {
          const isActive = activeFilter === option.value;
          const count = counts[option.value];

          return (
            <Link
              key={option.value}
              href={buildBookingsPageHref(option.value, query)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold transition",
                isActive
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] shadow-sm"
                  : "border-[#E5E7EB] bg-[#F9FAFB] text-slate-600 hover:border-[#BFDBFE] hover:bg-white hover:text-[#2563EB]",
              ].join(" ")}
            >
              {option.label}
              <span
                className={[
                  "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-black",
                  isActive
                    ? "bg-[#2563EB] text-white"
                    : "bg-white text-slate-500",
                ].join(" ")}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </CustomerCard>
  );
}
