import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import {
  DashButton,
  DashLink,
  DashboardPage,
  PageHeader,
  Panel,
  StatusBadge,
} from "./ui";

const PORTFOLIO_ITEMS = [
  {
    title: "Corporate Gala Menu",
    desc: "3-course plated dinner for up to 200 guests.",
    tier: "Premium",
    price: "₱4,675/pp",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCKSdZ4jru9xHs9vITdi8Hr23Ikn4ccCwSki64m_gUmX7KCXQ-9yUnmtGFNG-PFAPmzk7wGkw3xp6gjAfM49dANyf7hMJ0yWHdr26B_GgNX4_4GrJL1p2XNC0aWuuFN5BgGoaWfq3-lYsnWZipRHwCFtx2v25ykfBG7aN0cW7snBTBKZYkAa7wjBwxdM5BvTnuKq6SD6_1ByqYqRFyusdcsuzoBi7qRTPGDcpTJr6Dtn5C1j48WwwNCdzpOlV_Zg0aI-r2cYF9XBBvv",
  },
  {
    title: "Rustic Grazing Table",
    desc: "Assorted charcuterie and artisanal local cheeses.",
    tier: "Standard",
    price: "₱2,475/pp",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBvcEZ-e6Iq2-ygWOojCZLfG4IgZ6UlJ9SsrXzqKd2mMgLV3VZBDOEI_7V_Zaw_uQKdnexSYi5iSVJg28ShdSot0VsopEiSHfa3V5mVPbpx1zZ9o3Qg1cKUyopHkrwPoS0KNAoTNsE86QomPT-QlFzB-Xbfek2Uy8Jx1e_OGL6yJeICRSJzownGHKaUxVmgvJYm_ykNFoIpoq_VPsFd5lGcd23T5llfvYPe54cCYpQZWW6rRpz6iAY3TbUB01HcNRVckbtPMfGKCRp7",
  },
  {
    title: "Bespoke Cocktail Service",
    desc: "Signature mixology with local seasonal ingredients.",
    tier: "Add-on",
    price: "₱1,375/pp",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA_X-wd4DQQ_twIdU_NIIgOfQ4xBdoHgkPKMIOUDO2VJyqOTRld7qEr0pOem42393eRFQNCqO_21FE4qDVBnYc_bGFcpWRLA2CyJ8imOovazeo8IeYzzwyuQ50lqE4ApXlN6onmzkIw1NfTiLCPZjPuMvM_V7a8dHhEzsJ9l12y7ITWNOThNpdHgf9k3A_a9_9UuXFxIf8EUJkI1Nh_BwEygYa4D3nVBi7r87YEqHek43POUrbOrugFv-um8diMd8NMbXoCqZNZMTDT",
  },
];

const ASSIGNMENTS = [
  {
    date: "Oct 24, 2026",
    time: "18:00 - 22:00",
    venue: "The Glass Pavilion",
    event: "Lakeside Wedding Reception",
    pkg: "Platinum Gala Menu",
    status: "confirmed" as const,
    label: "Confirmed",
  },
  {
    date: "Oct 27, 2026",
    time: "12:00 - 15:00",
    venue: "TechFlow Offices",
    event: "Corporate Networking Lunch",
    pkg: "Artisan Deli Board",
    status: "pending" as const,
    label: "Pending Final Menu",
  },
  {
    date: "Nov 02, 2026",
    time: "19:00 - 23:00",
    venue: "Heritage Hall",
    event: "Charity Foundation Ball",
    pkg: "Full Banquet Service",
    status: "confirmed" as const,
    label: "Confirmed",
  },
];

const SERVICE_CATEGORIES = [
  "Catering",
  "Photography",
  "Videography",
  "Floral Design",
  "Event Styling",
  "Makeup Artists",
  "Entertainment",
  "DJs",
  "Sound & Lights",
  "Event Rentals",
  "Transportation",
  "Security",
];

type SupplierOverviewProps = {
  businessName?: string;
  expectedEarnings?: string;
  activeJobs?: number;
  weeklyEvents?: number;
};

export function SupplierOverview({
  businessName = "Artisan Catering Co.",
  expectedEarnings = "₱698,880",
  activeJobs = 8,
  weeklyEvents = 4,
}: SupplierOverviewProps) {
  return (
    <DashboardPage className="pb-20">
      <PageHeader
        title={`Welcome back, ${businessName}`}
        description={`You have ${weeklyEvents} events scheduled for this week.`}
        actions={
          <DashButton>
            <MaterialIcon name="event_available" className="text-[18px]" />
            Update Availability
          </DashButton>
        }
      />

      <div className="flex flex-wrap gap-2">
        {SERVICE_CATEGORIES.map((cat) => (
          <span
            key={cat}
            className="rounded-full border border-[#e8deda] bg-white px-3 py-1 text-xs font-semibold text-[#565e74]"
          >
            {cat}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Inquiry Analytics</h3>
              <p className="text-sm text-[#565e74]">Leads generated via venue packages</p>
            </div>
            <select className="h-10 rounded-xl border border-[#e8deda] bg-[#fafbfc] px-3 text-sm outline-none focus:ring-2 focus:ring-[#9a442d]/10">
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="flex h-56 items-end justify-between gap-2">
            {[
              { label: "Mon", h: 40 },
              { label: "Tue", h: 65 },
              { label: "Wed", h: 45 },
              { label: "Thu", h: 90, active: true },
              { label: "Fri", h: 60 },
              { label: "Sat", h: 30 },
              { label: "Sun", h: 20 },
            ].map((bar) => (
              <div key={bar.label} className="group flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full max-w-[48px] rounded-t-lg transition ${
                    bar.active
                      ? "bg-[#9a442d]"
                      : "bg-[#e8deda] group-hover:bg-[#e07a5f]/70"
                  }`}
                  style={{ height: `${bar.h}%` }}
                />
                <span className="text-[10px] font-bold uppercase text-[#88726d]">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4 xl:col-span-4">
          <div className="flex min-h-[148px] flex-col justify-between rounded-2xl bg-[#9a442d] p-6 text-white shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] opacity-85">
                Expected Earnings
              </span>
              <MaterialIcon name="trending_up" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold tracking-tight">{expectedEarnings}</p>
              <p className="mt-1 text-sm opacity-85">+12% from last month</p>
            </div>
          </div>
          <Panel className="flex min-h-[148px] flex-col justify-between p-5">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#565e74]">
                Active Jobs
              </span>
              <MaterialIcon name="work" className="text-[#9a442d]" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold tracking-tight">
                {String(activeJobs).padStart(2, "0")}
              </p>
              <p className="mt-1 text-sm text-[#565e74]">Next event in 2 days</p>
            </div>
          </Panel>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Service Portfolio</h3>
          <DashLink href="#">View All</DashLink>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PORTFOLIO_ITEMS.map((item) => (
            <div
              key={item.title}
              className="group overflow-hidden rounded-2xl border border-[#e8deda] bg-white shadow-sm transition hover:border-[#9a442d]/20 hover:shadow-md"
            >
              <div className="aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h4 className="font-semibold">{item.title}</h4>
                <p className="mt-1 line-clamp-2 text-sm text-[#565e74]">{item.desc}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-md bg-[#f2f4f6] px-2 py-0.5 text-[10px] font-bold uppercase">
                    {item.tier}
                  </span>
                  <span className="text-sm font-semibold text-[#9a442d]">{item.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Panel padding={false}>
        <div className="flex items-center justify-between border-b border-[#f0ebe8] px-6 py-5">
          <div>
            <h3 className="font-display text-lg font-semibold">Upcoming Assignments</h3>
            <p className="text-sm text-[#565e74]">Your scheduled events across partner venues</p>
          </div>
        </div>
        <div className="divide-y divide-[#f0ebe8]">
          {ASSIGNMENTS.map((row) => (
            <div
              key={row.date + row.venue}
              className="grid grid-cols-1 gap-2 px-6 py-4 transition hover:bg-[#fafbfc] sm:grid-cols-[140px_1fr_1fr_auto] sm:items-center sm:gap-4"
            >
              <div>
                <p className="font-semibold">{row.date}</p>
                <p className="text-sm text-[#565e74]">{row.time}</p>
              </div>
              <div>
                <p className="font-semibold">{row.venue}</p>
                <p className="text-sm text-[#565e74]">{row.event}</p>
              </div>
              <p className="text-sm text-[#565e74]">{row.pkg}</p>
              <StatusBadge status={row.status} label={row.label} />
            </div>
          ))}
        </div>
      </Panel>

      <footer className="flex flex-col items-center justify-between gap-3 border-t border-[#e8deda] pt-6 text-sm text-[#565e74] md:flex-row">
        <p>© 2026 Venora Marketplace. All rights reserved.</p>
        <div className="flex gap-5">
          {["Privacy Policy", "Supplier Terms", "Support"].map((link) => (
            <Link
              key={link}
              href="#"
              className="text-xs font-semibold uppercase tracking-wide hover:text-[#9a442d]"
            >
              {link}
            </Link>
          ))}
        </div>
      </footer>
    </DashboardPage>
  );
}
