"use client";

import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import {
  DashButton,
  DashLink,
  DashboardPage,
  PageHeader,
  Panel,
} from "./ui";

const APPROVAL_QUEUE = [
  {
    name: "The Skyloft Collective",
    location: "Makati, Metro Manila",
    type: "VENUE" as const,
    date: "Oct 24, 14:22",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDasbiiMJuqun6UZ4e41Vy8w-VLP0X9TPKE7UoV0Jfozi9N-oA3WzeGjC66TDt15nydnPXzkmELv9wWhnyXbvVfchlmp7Ps-lz0VTluJbMw5RS6NU4IYqIYxnnvmRkkLiRL4vT7zxrIxCPX9rDNYEJ9HCC1Hi4dR2Ha-idKM2Ry4RbNdhC-kiKv93yf5spcNBQkWyLG8U8G2y2l64QzY24uQXG9TpTiRpsYlsYC6PXoiBQynpxQPsZXBpgrM8_MNQNQwXYCnhmQkHsp",
  },
  {
    name: "Artisan Gastronomy",
    location: "Cebu City, Cebu",
    type: "SUPPLIER" as const,
    date: "Oct 24, 09:15",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDrRiC0qileGkFxr7oYmUj3LksZaLinvC6UIAJRGRROaCdBDFJ8QAV6EWzQ05d0SLCJwTqtuTikq-DmC5GSb_Zw8HUv9Smw8QeoXiKU7_qK7okVZozW6rnCsF8uKYH7T8GZV-VINpk-_D7cNID9i0Em67NISqvJHAe588FFnFVUo9YSKcYSIcJtRugU_3wUnODa-tdu_RszpsXbUYtbxLTk5MPwMZYW_hNP0EaNBiT1GeOXrh1zOYKmeC1htuU3OhrWHh7NIQo1QSPH",
  },
  {
    name: "Warehouse 51 Studio",
    location: "Quezon City, Metro Manila",
    type: "VENUE" as const,
    date: "Oct 23, 17:40",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBQKtZqc_XBY7HaIqAE1JWdO0XhFZID64aVicW9MvjtMJSRNjfEUkPvOlKvW8Q3yPmraxOxiGOBkOShww0MF3vWX5LkqLdAHZjwL4PLngLfGK8wA2JJpMNGs2E3fYpLb3qKvRd2k_n5z2ZOyjfEfYC6huZQbYlhFnn4a63ddJv8CFu52dzjISqK1XBOESzow-0y9sqPdLBIJ0lRqOf4cH2UQXrBDlfYMkTZlY_MPbDgljDO8OgCf6S8VjXP-hQ0yUKRda7ctpoAxqjV",
  },
];

const SYSTEM_EVENTS = [
  {
    icon: "settings",
    iconClass: "bg-blue-50 text-blue-600",
    title: "AI Settings updated by Admin: Jordan T.",
    meta: "32 minutes ago · Predictive Matching Engine",
  },
  {
    icon: "verified_user",
    iconClass: "bg-[#fdf4f1] text-[#9a442d]",
    title: "Verification Success: Villa Mediterranean",
    meta: "1 hour ago · Auto-approved by Compliance AI v2.4",
  },
  {
    icon: "warning",
    iconClass: "bg-red-50 text-[#ba1a1a]",
    title: "Anomaly Detected: Rapid payout request",
    meta: "2 hours ago · Supplier ID: #98221",
    action: "REVIEW",
  },
];

export function AdminOverview() {
  return (
    <DashboardPage className="pb-20">
      <PageHeader
        eyebrow="Platform"
        title="Platform Overview"
        description="Real-time monitoring of marketplace health, venue acquisition pipelines, and transactional integrity."
        actions={
          <>
            <DashButton variant="secondary">
              <MaterialIcon name="download" className="text-[18px]" />
              Export Report
            </DashButton>
            <DashButton>
              <MaterialIcon name="add_circle" className="text-[18px]" />
              Create Event
            </DashButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Panel className="relative overflow-hidden md:col-span-2">
          <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-[0.04]">
            <MaterialIcon name="trending_up" className="text-[72px]" />
          </div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#565e74]">
            Gross Merchandise Value
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <span className="font-display text-4xl font-bold tracking-tight">₱235M</span>
            <span className="mb-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              <MaterialIcon name="arrow_drop_up" className="text-base" />
              +12.4%
            </span>
          </div>
          <p className="mt-2 text-sm text-[#565e74]">vs. last 30 days · Target ₱280M by EOM</p>
        </Panel>

        {[
          { label: "Active Users", value: "18.5k", trend: "+8.2%", icon: "group" },
          { label: "Conversion Rate", value: "4.82%", trend: "-0.4%", icon: "ads_click", down: true },
        ].map((stat) => (
          <Panel key={stat.label}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#565e74]">
              {stat.label}
            </p>
            <p className="font-display text-3xl font-bold">{stat.value}</p>
            <p
              className={`mt-2 inline-flex items-center text-xs font-bold ${
                stat.down ? "text-[#9a442d]" : "text-emerald-700"
              }`}
            >
              <MaterialIcon
                name={stat.down ? "arrow_drop_down" : "arrow_drop_up"}
                className="text-base"
              />
              {stat.trend}
            </p>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Priority Approval Queue</h2>
            <span className="rounded-full bg-[#9a442d] px-2.5 py-0.5 text-[10px] font-bold text-white">
              12 PENDING
            </span>
          </div>
          <Panel padding={false}>
            <div className="divide-y divide-[#f0ebe8]">
              {APPROVAL_QUEUE.map((item) => (
                <div
                  key={item.name}
                  className="group flex flex-col gap-4 p-5 transition hover:bg-[#fafbfc] sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f2f4f6]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.name}</p>
                      <p className="truncate text-sm text-[#565e74]">{item.location}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      item.type === "VENUE"
                        ? "bg-[#d3e4fe] text-[#1f2f43]"
                        : "bg-[#dae2fd] text-[#131b2e]"
                    }`}
                  >
                    {item.type}
                  </span>
                  <p className="shrink-0 text-sm text-[#565e74]">{item.date}</p>
                  <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-[#ba1a1a] hover:bg-red-50"
                    >
                      <MaterialIcon name="close" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                    >
                      <MaterialIcon name="check" />
                    </button>
                    <Link
                      href="/admin/venues"
                      className="rounded-lg p-2 text-[#565e74] hover:bg-[#f2f4f6]"
                    >
                      <MaterialIcon name="chevron_right" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#f0ebe8] bg-[#fafbfc] p-4 text-center">
              <DashLink href="/admin/venues">View Full Queue</DashLink>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Financial Monitoring</h3>
              <MaterialIcon name="more_vert" className="text-[#88726d]" />
            </div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-[#565e74]">Commission</p>
                <p className="font-display text-2xl font-bold">₱15.9M</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-emerald-700">+5.2% WoW</p>
                <p className="text-[#565e74]">Avg. 15.2%</p>
              </div>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#f0ebe8]">
              <div className="h-full w-[72%] rounded-full bg-[#9a442d]" />
            </div>
            <div className="flex justify-between text-xs text-[#565e74]">
              <span>₱0</span>
              <span>Target ₱22M</span>
            </div>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center gap-2">
              <MaterialIcon name="security" className="text-[#9a442d]" filled />
              <h3 className="font-semibold">Trust & Safety AI</h3>
            </div>
            <div className="mb-4 flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    stroke="#f0ebe8"
                    strokeWidth="6"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="6"
                    strokeDasharray="163"
                    strokeDashoffset="16"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-sm font-bold">90%</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Health Score</p>
                <p className="text-sm text-[#565e74]">4 suspicious activities blocked in 24h</p>
              </div>
            </div>
            <Link
              href="/admin/reports"
              className="block rounded-xl bg-[#f2f4f6] py-2.5 text-center text-sm font-semibold transition hover:bg-[#eceef0]"
            >
              Open Audit Log
            </Link>
          </Panel>

          <Panel>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[#565e74]">
              Infrastructure
            </p>
            <div className="space-y-3">
              {[
                { name: "Core Engine", status: "99.99%", ok: true },
                { name: "Payment Gateway", status: "Operational", ok: true },
                { name: "Image CDN", status: "High Latency", ok: false },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        item.ok ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {item.name}
                  </div>
                  <span className="text-[#565e74]">{item.status}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel padding={false}>
        <div className="flex items-center justify-between border-b border-[#f0ebe8] px-6 py-5">
          <h2 className="font-display text-lg font-semibold">Recent System Events</h2>
          <DashLink href="/admin/reports">View All Logs</DashLink>
        </div>
        <div className="divide-y divide-[#f0ebe8]">
          {SYSTEM_EVENTS.map((event) => (
            <div
              key={event.title}
              className="flex items-center gap-4 px-6 py-4 transition hover:bg-[#fafbfc]"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${event.iconClass}`}
              >
                <MaterialIcon name={event.icon} className="text-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="truncate text-xs text-[#565e74]">{event.meta}</p>
              </div>
              {event.action ? (
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-[#ba1a1a]"
                >
                  {event.action}
                </button>
              ) : (
                <MaterialIcon name="open_in_new" className="shrink-0 text-[#88726d] opacity-40" />
              )}
            </div>
          ))}
        </div>
      </Panel>
    </DashboardPage>
  );
}
