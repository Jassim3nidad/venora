import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Heart,
  LayoutDashboard,
  MapPin,
  Search,
  Settings,
  Star,
  UserRound,
} from "lucide-react";

const quickStats = [
  {
    title: "Saved Venues",
    value: "12",
    description: "Venues saved for future events.",
    icon: Heart,
  },
  {
    title: "Active Bookings",
    value: "3",
    description: "Current booking requests in progress.",
    icon: CalendarCheck,
  },
  {
    title: "Venue Searches",
    value: "28",
    description: "Recent venue discovery activity.",
    icon: Search,
  },
  {
    title: "Reviews Given",
    value: "5",
    description: "Verified reviews submitted after events.",
    icon: Star,
  },
];

const bookingRows = [
  {
    event: "Santos-Reyes Wedding",
    venue: "The Glass Garden",
    date: "Feb 18, 2026",
    status: "Confirmed",
  },
  {
    event: "Birthday Celebration",
    venue: "Rosewood Pavilion",
    date: "Mar 8, 2026",
    status: "Pending",
  },
  {
    event: "Corporate Seminar",
    venue: "Azure Grand Hall",
    date: "Mar 12, 2026",
    status: "Inquiry Sent",
  },
];

const savedVenues = [
  {
    name: "The Glass Garden",
    location: "Tagaytay, Cavite",
    price: "Starts at ₱120,000",
    rating: "4.9",
  },
  {
    name: "Azure Grand Hall",
    location: "Makati City",
    price: "Starts at ₱85,000",
    rating: "4.8",
  },
  {
    name: "Rosewood Pavilion",
    location: "Batangas",
    price: "Starts at ₱95,000",
    rating: "4.7",
  },
];

const navItems = [
  {
    label: "Customer Dashboard",
    href: "/dashboard/customer",
    icon: LayoutDashboard,
  },
  {
    label: "Browse Venues",
    href: "/venues",
    icon: Search,
  },
  {
    label: "My Bookings",
    href: "/bookings",
    icon: CalendarCheck,
  },
  {
    label: "Favorites",
    href: "/favorites",
    icon: Heart,
  },
  {
    label: "Account",
    href: "/account",
    icon: UserRound,
  },
];

export default function CustomerDashboardPage() {
  return (
    <main className="flex min-h-screen bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside className="hidden min-h-screen w-[280px] shrink-0 border-r border-[#E5E7EB] bg-white px-[20px] py-[24px] lg:block">
        <div className="mb-[32px]">
          <Link href="/" className="flex items-center gap-[10px]">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#EFF6FF] text-[#2563EB]">
              <Heart className="h-[20px] w-[20px]" />
            </div>

            <div>
              <p className="text-[20px] font-extrabold leading-[26px] tracking-[-0.02em] text-[#111827]">
                Venora
              </p>
              <p className="text-[12px] font-medium text-[#6B7280]">
                Customer
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-col gap-[8px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard/customer";

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
            Customer Shell
          </p>

          <p className="mt-[4px] text-[12px] leading-[18px] text-[#4B5563]">
            Ready to connect with real customer booking and favorite data.
          </p>
        </div>
      </aside>

      {/* Content */}
      <section className="flex min-h-screen flex-1 flex-col">
        {/* Topbar */}
        <header className="border-b border-[#E5E7EB] bg-white px-[24px] py-[20px] lg:px-[40px]">
          <div className="flex flex-col gap-[14px] lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="mb-[8px] inline-flex rounded-full bg-[#EFF6FF] px-[10px] py-[4px] text-[12px] font-bold uppercase tracking-[0.08em] text-[#2563EB]">
                Customer
              </span>

              <h1 className="text-[28px] font-extrabold leading-[36px] tracking-[-0.03em] text-[#111827]">
                Customer Dashboard
              </h1>

              <p className="mt-[4px] max-w-[680px] text-[15px] leading-[23px] text-[#4B5563]">
                Discover venues, track booking requests, manage saved venues,
                and continue planning your next event.
              </p>
            </div>

            <div className="flex items-center gap-[10px]">
              <button
                type="button"
                className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-white text-[#4B5563] transition hover:border-[#2563EB] hover:text-[#2563EB]"
              >
                <Bell className="h-[18px] w-[18px]" />
              </button>

              <Link
                href="/venues"
                className="inline-flex h-[42px] items-center justify-center rounded-[12px] bg-[#2563EB] px-[16px] text-[14px] font-bold text-white transition hover:bg-[#1D4ED8]"
              >
                Browse Venues
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1 px-[24px] py-[28px] lg:px-[40px]">
          {/* Welcome */}
          <section className="rounded-[22px] border border-[#E5E7EB] bg-white p-[24px] shadow-sm">
            <div className="grid gap-[24px] lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <h2 className="text-[26px] font-extrabold leading-[34px] tracking-[-0.03em] text-[#111827]">
                  Welcome back, Jared
                </h2>

                <p className="mt-[6px] max-w-[620px] text-[15px] leading-[24px] text-[#4B5563]">
                  Continue your venue search, review your saved event spaces,
                  and keep track of your booking requests in one place.
                </p>

                <div className="mt-[18px] flex flex-wrap gap-[10px]">
                  <Link
                    href="/venues"
                    className="inline-flex h-[42px] items-center justify-center rounded-[12px] bg-[#2563EB] px-[16px] text-[14px] font-bold text-white transition hover:bg-[#1D4ED8]"
                  >
                    Find a Venue
                  </Link>

                  <Link
                    href="/bookings"
                    className="inline-flex h-[42px] items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-white px-[16px] text-[14px] font-bold text-[#111827] transition hover:border-[#2563EB] hover:text-[#2563EB]"
                  >
                    View Bookings
                  </Link>
                </div>
              </div>

              <div className="rounded-[18px] bg-[#EFF6FF] p-[20px]">
                <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2563EB]">
                  Planning Tip
                </p>

                <p className="mt-[8px] text-[18px] font-extrabold leading-[26px] text-[#111827]">
                  Save multiple venues before booking so you can compare
                  pricing, capacity, location, and packages.
                </p>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="mt-[24px] grid gap-[16px] md:grid-cols-2 xl:grid-cols-4">
            {quickStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-[18px] border border-[#E5E7EB] bg-white p-[20px] shadow-sm"
                >
                  <div className="mb-[16px] flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#EFF6FF] text-[#2563EB]">
                    <Icon className="h-[20px] w-[20px]" />
                  </div>

                  <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#6B7280]">
                    {stat.title}
                  </p>

                  <h3 className="mt-[6px] text-[28px] font-extrabold leading-[34px] text-[#111827]">
                    {stat.value}
                  </h3>

                  <p className="mt-[6px] text-[14px] leading-[22px] text-[#4B5563]">
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Main Grid */}
          <div className="mt-[24px] grid gap-[24px] xl:grid-cols-[1.25fr_0.8fr]">
            {/* Bookings */}
            <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-[24px] shadow-sm">
              <div className="mb-[18px] flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-extrabold leading-[28px] text-[#111827]">
                    My Booking Requests
                  </h2>

                  <p className="mt-[4px] text-[14px] leading-[22px] text-[#4B5563]">
                    Track your current and upcoming venue bookings.
                  </p>
                </div>

                <Link
                  href="/bookings"
                  className="text-[13px] font-bold text-[#2563EB] hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="overflow-hidden rounded-[14px] border border-[#E5E7EB]">
                <table className="w-full border-collapse bg-white text-left">
                  <thead className="bg-[#EFF6FF]">
                    <tr>
                      <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8]">
                        Event
                      </th>
                      <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8]">
                        Venue
                      </th>
                      <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8]">
                        Date
                      </th>
                      <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8]">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {bookingRows.map((booking) => (
                      <tr
                        key={booking.event}
                        className="border-t border-[#E5E7EB]"
                      >
                        <td className="px-[16px] py-[14px] text-[14px] font-bold text-[#111827]">
                          {booking.event}
                        </td>
                        <td className="px-[16px] py-[14px] text-[14px] text-[#4B5563]">
                          {booking.venue}
                        </td>
                        <td className="px-[16px] py-[14px] text-[14px] text-[#4B5563]">
                          {booking.date}
                        </td>
                        <td className="px-[16px] py-[14px]">
                          <span className="rounded-full bg-[#EFF6FF] px-[10px] py-[5px] text-[12px] font-bold text-[#2563EB]">
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-[24px] shadow-sm">
              <h2 className="text-[20px] font-extrabold leading-[28px] text-[#111827]">
                Quick Actions
              </h2>

              <p className="mt-[4px] text-[14px] leading-[22px] text-[#4B5563]">
                Continue planning and managing your event.
              </p>

              <div className="mt-[20px] grid gap-[12px]">
                {[
                  {
                    label: "Search venues",
                    href: "/venues",
                    icon: Search,
                  },
                  {
                    label: "View saved venues",
                    href: "/favorites",
                    icon: Heart,
                  },
                  {
                    label: "Track bookings",
                    href: "/bookings",
                    icon: CalendarCheck,
                  },
                  {
                    label: "Update account",
                    href: "/account",
                    icon: UserRound,
                  },
                ].map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex h-[50px] items-center justify-between rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-[14px] text-[14px] font-bold text-[#111827] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                    >
                      <span className="flex items-center gap-[10px]">
                        <Icon className="h-[18px] w-[18px]" />
                        {action.label}
                      </span>

                      <ArrowRight className="h-[16px] w-[16px]" />
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Saved Venues */}
          <section className="mt-[24px] rounded-[20px] border border-[#E5E7EB] bg-white p-[24px] shadow-sm">
            <div className="mb-[18px] flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-extrabold leading-[28px] text-[#111827]">
                  Saved Venues
                </h2>

                <p className="mt-[4px] text-[14px] leading-[22px] text-[#4B5563]">
                  Venues you saved while browsing the marketplace.
                </p>
              </div>

              <Link
                href="/favorites"
                className="text-[13px] font-bold text-[#2563EB] hover:underline"
              >
                View favorites
              </Link>
            </div>

            <div className="grid gap-[14px] md:grid-cols-3">
              {savedVenues.map((venue) => (
                <div
                  key={venue.name}
                  className="rounded-[16px] border border-[#E5E7EB] bg-[#F9FAFB] p-[18px]"
                >
                  <div className="mb-[14px] h-[110px] rounded-[14px] bg-[#EFF6FF]" />

                  <h3 className="text-[16px] font-extrabold leading-[22px] text-[#111827]">
                    {venue.name}
                  </h3>

                  <p className="mt-[6px] flex items-center gap-[6px] text-[13px] font-medium text-[#4B5563]">
                    <MapPin className="h-[14px] w-[14px] text-[#2563EB]" />
                    {venue.location}
                  </p>

                  <div className="mt-[14px] flex items-center justify-between">
                    <span className="text-[13px] font-bold text-[#111827]">
                      {venue.price}
                    </span>

                    <span className="flex items-center gap-[4px] text-[13px] font-bold text-[#2563EB]">
                      <Star className="h-[14px] w-[14px]" />
                      {venue.rating}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}