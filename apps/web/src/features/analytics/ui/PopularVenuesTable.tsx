import { StatusBadge } from "@/components/dashboard/enterprise";
import type { PopularVenueResult } from "../application/queries";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PopularVenuesTable({
  venues,
}: {
  venues: PopularVenueResult[];
}) {
  if (venues.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[22px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-6 py-10 text-center text-sm font-medium text-[#64748b]">
        No popular venue data yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {venues.map((venue, index) => (
        <div
          key={venue.id}
          className="grid gap-3 rounded-[18px] border border-[#e5e7eb] bg-white px-4 py-3 shadow-sm shadow-slate-100 sm:grid-cols-[42px_minmax(0,1fr)_auto]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff6ff] text-sm font-black text-[#1d4ed8] ring-1 ring-[#dbeafe]">
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#111827]">
              {venue.label}
            </p>
            <p className="mt-1 truncate text-xs font-medium text-[#64748b]">
              {venue.city}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge
                status="active"
                label={`${venue.bookings} bookings`}
              />
              {venue.rating > 0 ? (
                <StatusBadge
                  status="completed"
                  label={`${venue.rating.toFixed(1)} rating`}
                />
              ) : null}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
              Revenue
            </p>
            <p className="mt-1 text-sm font-black text-[#0f172a]">
              {formatCurrency(venue.revenue)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
