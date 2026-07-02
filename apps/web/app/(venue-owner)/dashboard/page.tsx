import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
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

export const metadata = {
  title: "Venue Owner Dashboard",
  description: "Manage venue listings, booking requests, calendars, packages, staff, and business performance.",
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "hsl(45 96% 54%)",
  approved:  "hsl(142 71% 45%)",
  declined:  "hsl(0 72% 51%)",
  cancelled: "hsl(0 72% 51%)",
  completed: "hsl(217 91% 60%)",
  expired:   "hsl(217 70% 47%)",
};

export default async function VenueOwnerDashboardPage() {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch organizations user belongs to
  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = (members ?? []).map((m: any) => m.organization_id);

  // Fetch venues for these organizations
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name")
    .in("organization_id", orgIds.length ? orgIds : ["__none__"]);
  const venueIds = (venues ?? []).map((v: any) => v.id);

  const totalVenues = venues?.length ?? 0;

  // Total bookings count
  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("venue_id", venueIds.length ? venueIds : ["__none__"]);

  // Pending bookings count
  const { count: pendingBookings } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .eq("status", "pending");

  // Monthly Revenue (sum of total_amount for approved or completed bookings in the current month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: monthBookings } = await supabase
    .from("bookings")
    .select("total_amount")
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .in("status", ["approved", "completed"])
    .gte("event_date", startOfMonth)
    .lte("event_date", endOfMonth);

  const monthlyRevenue = (monthBookings ?? []).reduce(
    (sum: number, b: any) => sum + (b.total_amount ?? 0),
    0
  );

  // Upcoming bookings list (latest 5 bookings)
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, event_date, status, total_amount, guest_count, venues(name), profiles!customer_id(full_name)")
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .order("event_date", { ascending: true })
    .limit(5);

  // Chart data: Confirmations per month in the current year
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();

  const { data: yearBookings } = await supabase
    .from("bookings")
    .select("event_date")
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .in("status", ["approved", "completed"])
    .gte("event_date", startOfYear)
    .lte("event_date", endOfYear);

  const monthlyCounts = Array(12).fill(0);
  (yearBookings ?? []).forEach((b: any) => {
    const month = new Date(b.event_date).getMonth();
    monthlyCounts[month]++;
  });

  const maxVal = Math.max(...monthlyCounts, 1);
  // Scale bar height to max 180px, min 4px
  const heights = monthlyCounts.map(c => Math.max((c / maxVal) * 180, 6));

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
          description={`${totalVenues} active venue listing${totalVenues !== 1 ? "s" : ""} registered.`}
          icon={<Building2 className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Total Bookings"
          description={`${totalBookings ?? 0} total booking request${totalBookings !== 1 ? "s" : ""} received.`}
          icon={<ClipboardCheck className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Pending Bookings"
          description={`${pendingBookings ?? 0} request${pendingBookings !== 1 ? "s" : ""} require your review.`}
          icon={<Hourglass className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Monthly Revenue"
          description={`₱${monthlyRevenue.toLocaleString()} from confirmed events this month.`}
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
              Year {now.getFullYear()}
            </span>
          </div>

          <div className="flex h-[260px] items-end gap-[12px] rounded-[16px] bg-[#FFFDFC] px-[18px] py-[20px]">
            {heights.map((height, index) => (
              <div
                key={index}
                className="flex flex-1 flex-col items-center gap-[8px]"
              >
                <div className="relative group w-full flex justify-center">
                  <div
                    className="w-full max-w-[20px] rounded-t-[6px] bg-[#E07A5F] transition-all hover:bg-[#C4614A]"
                    style={{ height: `${height}px` }}
                  />
                  {/* Tooltip */}
                  <span className="absolute bottom-[100%] mb-[4px] hidden group-hover:block rounded bg-[#191C1E] px-[6px] py-[2px] text-[10px] font-bold text-white whitespace-nowrap">
                    {monthlyCounts[index]} booking{monthlyCounts[index] !== 1 ? "s" : ""}
                  </span>
                </div>
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
            ))}
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
              { label: "Review Booking Requests", href: "/dashboard/bookings" },
              { label: "Manage Calendar", href: "/dashboard/calendar" },
              { label: "Manage Packages", href: "/dashboard/packages" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex h-[48px] items-center justify-between rounded-[12px] border border-[#E9D5D0] bg-[#FFFDFC] px-[14px] text-left text-[14px] font-bold text-[#191C1E] transition hover:border-[#E07A5F] hover:bg-[#FFF4F0] hover:text-[#E07A5F] text-decoration-none"
              >
                {action.label}
                <span className="text-[#E07A5F]">→</span>
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Operations Cards */}
      <div className="mt-[24px] grid gap-[16px] md:grid-cols-3">
        <a href="/dashboard/calendar" className="text-decoration-none block">
          <DashboardCard
            title="Calendar Management"
            description="View reserved dates, tentative reservations, maintenance schedules, and blackout dates."
            icon={<CalendarDays className="h-[20px] w-[20px]" />}
          />
        </a>

        <a href="/dashboard/packages" className="text-decoration-none block">
          <DashboardCard
            title="Packages & Pricing"
            description="Configure package prices, inclusions, guest capacity, and supplier participation."
            icon={<PackageCheck className="h-[20px] w-[20px]" />}
          />
        </a>

        <a href="/dashboard/staff" className="text-decoration-none block">
          <DashboardCard
            title="Staff Management"
            description="Manage venue staff, roles, assignments, and operational permissions."
            icon={<UsersRound className="h-[20px] w-[20px]" />}
          />
        </a>
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
                  Customer
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
              {!recentBookings || recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-[24px] text-[14px] text-[#55423E]">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                recentBookings.map((booking: any) => (
                  <tr
                    key={booking.id}
                    className="border-t border-[#E9D5D0]"
                  >
                    <td className="px-[16px] py-[14px] text-[14px] font-bold text-[#191C1E]">
                      {(booking.profiles as any)?.full_name ?? "—"}
                    </td>
                    <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                      {(booking.venues as any)?.name ?? "—"}
                    </td>
                    <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                      {new Date(booking.event_date).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                    </td>
                    <td className="px-[16px] py-[14px]">
                      <span
                        className="rounded-full px-[10px] py-[5px] text-[12px] font-bold capitalize"
                        style={{
                          background: `${STATUS_COLORS[booking.status] ?? "hsl(217 70% 47%)"}20`,
                          color: STATUS_COLORS[booking.status] ?? "hsl(217 70% 47%)",
                        }}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-[16px] py-[14px] text-[14px] font-bold text-[#191C1E]">
                      {booking.total_amount ? `₱${booking.total_amount.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}