import Link from "next/link";
import { SlidersHorizontal, Search, ArrowUpDown, FilterX } from "lucide-react";
import {
  CUSTOMER_BOOKING_STATUS_FILTERS,
  buildBookingsPageHref,
  type CustomerBookingStatusFilter,
} from "@/features/booking/constants/customer-booking-filters";
import { CustomerCard } from "@/src/components/customer/CustomerUI";

type BookingStatusFilterBarProps = {
  activeFilter: CustomerBookingStatusFilter;
  counts: Record<CustomerBookingStatusFilter, number>;
  query?: { created?: string; cancelled?: string; q?: string; sort?: string };
  filteredCount: number;
  totalCount: number;
};

export function BookingStatusFilterBar({
  activeFilter,
  counts,
  query = {},
  filteredCount,
  totalCount,
}: BookingStatusFilterBarProps) {
  const q = query.q ?? "";
  const sort = query.sort ?? "newest";

  return (
    <CustomerCard className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
        <p className="text-sm font-extrabold text-slate-900">
          Filter by status
        </p>
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
                  "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold",
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

      <form className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
        <input type="hidden" name="status" value={activeFilter} />
        <label className="relative block">
          <span className="sr-only">Search venue bookings</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search venue name or location"
            className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-4 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
          />
        </label>

        <label>
          <span className="sr-only">Sort bookings</span>
          <select
            name="sort"
            defaultValue={sort}
            className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
          >
            <option value="newest">Newest first</option>
            <option value="event_date">Event date</option>
          </select>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white transition hover:bg-[#1D4ED8] lg:flex-none"
          >
            Apply
          </button>
          {Boolean(q || activeFilter !== "all" || sort !== "newest") ? (
            <Link
              href="/bookings"
              aria-label="Clear filters"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
            >
              <FilterX className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </form>

      <p className="mt-4 text-sm font-bold text-[#6B7280]">
        Showing {filteredCount} of {totalCount} venue bookings
      </p>
    </CustomerCard>
  );
}
