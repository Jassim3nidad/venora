import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Hourglass,
  PackageCheck,
  Banknote,
  UsersRound,
} from "lucide-react";
import {
  DashboardCard,
  DashboardShell,
} from "@/components/dashboard/DashboardShell";

export default function VenueOwnerDashboardPage() {
  return (
    <DashboardShell
      title="Venue Owner Dashboard"
      description="Manage venue listings, booking requests, calendars, packages, staff, and business performance."
      badge="Venue Owner"
    >
      {/* Summary Cards */}
      <div className="grid gap-[16px] md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Total Venues"
          description="8 active venue listings ready for customer discovery."
          icon={<Building2 className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Total Bookings"
          description="124 booking requests and confirmed reservations recorded."
          icon={<ClipboardCheck className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Pending Inquiries"
          description="18 customer inquiries need review or follow-up."
          icon={<Hourglass className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Monthly Revenue"
          description="₱485,000 estimated revenue from confirmed bookings."
          icon={<Banknote className="h-[20px] w-[20px]" />}
        />
      </div>

      {/* Main Dashboard Content */}
      <div className="mt-[24px] grid gap-[24px] xl:grid-cols-[1.4fr_0.8fr]">
        {/* Booking Performance */}
        <section className="rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
          <div className="mb-[20px] flex items-start justify-between gap-[16px]">
            <div>
              <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
                Booking Performance
              </h2>
              <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
                Monthly confirmed bookings across your venues.
              </p>
            </div>

            <span className="rounded-full bg-[#FFF4F0] px-[12px] py-[6px] text-[12px] font-bold text-[#E07A5F]">
              This Year
            </span>
          </div>

          <div className="flex h-[260px] items-end gap-[12px] rounded-[16px] bg-[#FFFDFC] px-[18px] py-[20px]">
            {[36, 52, 44, 68, 58, 84, 72, 96, 88, 110, 98, 124].map(
              (height, index) => (
                <div
                  key={index}
                  className="flex flex-1 flex-col items-center gap-[8px]"
                >
                  <div
                    className="w-full rounded-t-[10px] bg-[#E07A5F]/80"
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-[11px] font-bold text-[#88726D]">
                    {
                      [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ][index]
                    }
                  </span>
                </div>
              ),
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
          <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
            Quick Actions
          </h2>

          <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
            Common actions for managing your venue operations.
          </p>

          <div className="mt-[20px] grid gap-[12px]">
            {[
              "Add New Venue",
              "Review Booking Requests",
              "Manage Calendar",
              "Create Package",
            ].map((action) => (
              <button
                key={action}
                type="button"
                className="flex h-[48px] items-center justify-between rounded-[12px] border border-[#E9D5D0] bg-[#FFFDFC] px-[14px] text-left text-[14px] font-bold text-[#191C1E] transition hover:border-[#E07A5F] hover:bg-[#FFF4F0] hover:text-[#E07A5F]"
              >
                {action}
                <span className="text-[#E07A5F]">→</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Operations Cards */}
      <div className="mt-[24px] grid gap-[16px] md:grid-cols-3">
        <DashboardCard
          title="Calendar Management"
          description="View reserved dates, tentative reservations, maintenance schedules, and blackout dates."
          icon={<CalendarDays className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Packages & Pricing"
          description="Configure package prices, inclusions, guest capacity, and supplier participation."
          icon={<PackageCheck className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Staff Management"
          description="Manage venue staff, roles, assignments, and operational permissions."
          icon={<UsersRound className="h-[20px] w-[20px]" />}
        />
      </div>

      {/* Upcoming Bookings */}
      <section className="mt-[24px] rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
              Upcoming Bookings
            </h2>
            <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
              Recent reservations that need monitoring.
            </p>
          </div>

          <a
            href="/dashboard/bookings"
            className="rounded-[10px] bg-[#E07A5F] px-[14px] py-[9px] text-[13px] font-bold text-white transition hover:bg-[#9A442D]"
          >
            View All
          </a>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[#E9D5D0]">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-[#FFF4F0]">
              <tr>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Event
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Venue
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Date
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Status
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {[
                {
                  event: "Santos–Reyes Wedding",
                  venue: "The Glass Garden",
                  date: "Feb 18, 2026",
                  status: "Confirmed",
                  amount: "₱120,000",
                },
                {
                  event: "Corporate Gala Night",
                  venue: "Azure Grand Hall",
                  date: "Feb 22, 2026",
                  status: "Pending",
                  amount: "₱85,000",
                },
                {
                  event: "Debut Celebration",
                  venue: "Rosewood Pavilion",
                  date: "Mar 2, 2026",
                  status: "Tentative",
                  amount: "₱95,000",
                },
              ].map((booking) => (
                <tr
                  key={booking.event}
                  className="border-t border-[#E9D5D0]"
                >
                  <td className="px-[16px] py-[14px] text-[14px] font-bold text-[#191C1E]">
                    {booking.event}
                  </td>
                  <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                    {booking.venue}
                  </td>
                  <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                    {booking.date}
                  </td>
                  <td className="px-[16px] py-[14px]">
                    <span className="rounded-full bg-[#FFF4F0] px-[10px] py-[5px] text-[12px] font-bold text-[#E07A5F]">
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-[16px] py-[14px] text-[14px] font-bold text-[#191C1E]">
                    {booking.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analytics Preview */}
      <div className="mt-[24px] grid gap-[16px] md:grid-cols-2">
        <DashboardCard
          title="Business Analytics"
          description="Track revenue, inquiry conversion, occupancy rate, popular packages, and booking trends."
          icon={<BarChart3 className="h-[20px] w-[20px]" />}
        />

        <div className="rounded-[18px] border border-dashed border-[#E9D5D0] bg-white p-[20px] text-center shadow-sm">
          <h3 className="text-[17px] font-extrabold leading-[24px] text-[#191C1E]">
            Venue owner dashboard shell ready
          </h3>

          <p className="mx-auto mt-[6px] max-w-[520px] text-[14px] leading-[22px] text-[#55423E]">
            This overview page is ready to connect to venue owner role data from
            Supabase.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}