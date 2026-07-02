import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import {
  DashboardPage,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  StatusBadge,
} from "./ui";

const PORTFOLIO_KPIS = [
  {
    label: "Active Bookings",
    value: "84",
    trend: "+12%",
    progress: 75,
    icon: "event_available",
    accent: true,
  },
  {
    label: "Utilization Rate",
    value: "92.4%",
    trend: "+4.2%",
    progress: 92,
    icon: "pie_chart",
  },
  {
    label: "Net Revenue (MTD)",
    value: "₱7.9M",
    trend: "0.0%",
    progress: 50,
    icon: "payments",
    muted: true,
  },
  {
    label: "Customer CSAT",
    value: "4.9",
    progress: 98,
    icon: "star",
    stars: 5,
  },
];

const MANAGED_VENUES = [
  { name: "The Glasshouse Estate", bookings: 12, utilization: "94%", status: "Healthy" },
  { name: "Azure Grand Hall", bookings: 8, utilization: "88%", status: "Healthy" },
  { name: "Rosewood Pavilion", bookings: 6, utilization: "76%", status: "Monitor" },
];

const SUPPLIER_TASKS = [
  "Confirm catering headcount for Santos–Reyes Wedding",
  "Finalize photo schedule at Azure Grand Hall",
  "Review floral styling package for Debut Celebration",
  "Send updated event timeline to Heritage Hall client",
];

const UPCOMING_EVENTS = [
  {
    event: "Santos–Reyes Wedding",
    venue: "The Glasshouse Estate",
    date: "Feb 18, 2026",
    status: "Final Coordination",
  },
  {
    event: "Corporate Leadership Summit",
    venue: "Azure Grand Hall",
    date: "Feb 24, 2026",
    status: "Supplier Review",
  },
  {
    event: "Debut Celebration",
    venue: "Rosewood Pavilion",
    date: "Mar 6, 2026",
    status: "Pending Confirmation",
  },
];

export function CoordinatorOverview() {
  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Portfolio"
        title="Portfolio Performance"
        description="Real-time metrics across 12 managed venue locations."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PORTFOLIO_KPIS.map((kpi) => (
          <Panel key={kpi.label} className="p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#565e74]">
              {kpi.label}
            </p>
            <div className="mb-3 flex items-end justify-between gap-2">
              <span
                className={`font-display text-3xl font-bold tracking-tight ${
                  kpi.accent ? "text-[#9a442d]" : "text-[#191c1e]"
                }`}
              >
                {kpi.value}
              </span>
              {kpi.stars ? (
                <div className="flex text-[#e07a5f]">
                  {Array.from({ length: kpi.stars }).map((_, i) => (
                    <MaterialIcon key={i} name="star" className="text-sm" filled />
                  ))}
                </div>
              ) : kpi.trend ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    kpi.muted
                      ? "bg-[#f2f4f6] text-[#565e74]"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {kpi.trend}
                </span>
              ) : null}
            </div>
            <ProgressBar value={kpi.progress} />
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Managed Venue Listings"
            description="Coordinating bookings and calendars across your portfolio."
            action={
              <Link
                href="/dashboard/bookings"
                className="text-sm font-semibold text-[#9a442d] hover:underline"
              >
                View All
              </Link>
            }
            className="mb-5 border-0 pb-0"
          />
          <div className="space-y-3">
            {MANAGED_VENUES.map((venue) => (
              <div
                key={venue.name}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#f0ebe8] bg-[#fafbfc] p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{venue.name}</p>
                  <p className="text-sm text-[#565e74]">
                    {venue.bookings} active bookings · {venue.utilization} utilization
                  </p>
                </div>
                <StatusBadge status="approved" label={venue.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Coordination Checklist"
            description="High-priority tasks for today's event planning work."
            className="mb-5 border-0 pb-0"
          />
          <div className="space-y-2.5">
            {SUPPLIER_TASKS.map((task) => (
              <div
                key={task}
                className="flex items-start gap-3 rounded-xl border border-[#f0ebe8] bg-[#fafbfc] p-3.5"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fdf4f1] text-[#9a442d]">
                  <MaterialIcon name="task_alt" className="text-[18px]" />
                </span>
                <p className="text-sm font-medium leading-snug">{task}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel padding={false}>
        <div className="border-b border-[#f0ebe8] px-6 py-5">
          <h3 className="font-display text-lg font-semibold">Upcoming Coordinated Events</h3>
          <p className="mt-0.5 text-sm text-[#565e74]">
            Track event progress, venue coordination, and client status.
          </p>
        </div>
        <div className="divide-y divide-[#f0ebe8]">
          {UPCOMING_EVENTS.map((event) => (
            <div
              key={event.event}
              className="grid grid-cols-1 gap-2 px-6 py-4 transition hover:bg-[#fafbfc] sm:grid-cols-[1.2fr_1fr_auto_auto] sm:items-center sm:gap-4"
            >
              <p className="font-semibold">{event.event}</p>
              <p className="text-sm text-[#565e74]">{event.venue}</p>
              <p className="text-sm text-[#565e74]">{event.date}</p>
              <StatusBadge status="pending" label={event.status} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            title: "Operational Reports",
            desc: "Generate booking performance, utilization, and revenue reports.",
            icon: "assessment",
            href: "/dashboard/analytics",
          },
          {
            title: "Supplier Coordination",
            desc: "Coordinate catering, styling, photo, entertainment, and rentals.",
            icon: "handshake",
            href: "/dashboard/packages",
          },
          {
            title: "Customer Communication",
            desc: "Manage inquiries, planning updates, and booking changes.",
            icon: "forum",
            href: "/dashboard/bookings",
          },
        ].map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl border border-[#e8deda] bg-white p-5 shadow-sm transition hover:border-[#9a442d]/25 hover:shadow-md"
          >
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf4f1] text-[#9a442d] transition group-hover:bg-[#9a442d] group-hover:text-white">
              <MaterialIcon name={card.icon} />
            </span>
            <h4 className="font-display font-semibold">{card.title}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-[#565e74]">{card.desc}</p>
          </Link>
        ))}
      </div>
    </DashboardPage>
  );
}
