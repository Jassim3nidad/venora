import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";

const adminStats = [
  {
    title: "Total Users",
    value: "1,248",
    description: "Customers, venue owners, suppliers, and coordinators.",
    icon: UsersRound,
  },
  {
    title: "Pending Venues",
    value: "18",
    description: "Venue listings waiting for review and approval.",
    icon: Building2,
  },
  {
    title: "Supplier Reviews",
    value: "9",
    description: "Supplier accreditation requests need checking.",
    icon: Store,
  },
  {
    title: "Monthly Commission",
    value: "₱84,500",
    description: "Estimated platform commission for this month.",
    icon: Banknote,
  },
];

const adminModules = [
  {
    title: "User Management",
    description:
      "Review users, manage roles, verify accounts, and monitor platform access.",
    href: "/admin/users",
    icon: UsersRound,
  },
  {
    title: "Venue Approval",
    description:
      "Approve, reject, and review venue listings submitted by venue owners.",
    href: "/admin/venues",
    icon: Building2,
  },
  {
    title: "Supplier Accreditation",
    description:
      "Review supplier profiles, services, documents, and accreditation status.",
    href: "/admin/suppliers",
    icon: Store,
  },
  {
    title: "Commission Tracking",
    description:
      "Monitor platform fees, booking commissions, and payout summaries.",
    href: "/admin/commissions",
    icon: Banknote,
  },
  {
    title: "Reports",
    description:
      "View platform analytics, booking trends, user activity, and performance reports.",
    href: "/admin/reports",
    icon: FileText,
  },
];

const pendingReviews = [
  {
    item: "The Glasshouse Estate",
    type: "Venue Listing",
    submittedBy: "Maria Santos",
    status: "Pending Review",
  },
  {
    item: "Premium Wedding Styling",
    type: "Supplier Service",
    submittedBy: "Elegant Events Co.",
    status: "Needs Verification",
  },
  {
    item: "Azure Grand Hall",
    type: "Venue Listing",
    submittedBy: "Daniel Cruz",
    status: "Pending Approval",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#FFFDFC] px-[24px] py-[28px] lg:px-[40px]">
      {/* Header */}
      <section className="rounded-[24px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
        <div className="flex flex-col gap-[18px] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="mb-[8px] inline-flex rounded-full bg-[#FFF4F0] px-[10px] py-[4px] text-[12px] font-bold uppercase tracking-[0.08em] text-[#E07A5F]">
              Administrator
            </span>
 
            <h1 className="text-[30px] font-extrabold leading-[38px] tracking-[-0.03em] text-[#191C1E]">
              Admin Dashboard
            </h1>
 
            <p className="mt-[6px] max-w-[760px] text-[15px] leading-[24px] text-[#55423E]">
              Manage users, venue approvals, supplier accreditation,
              commissions, reports, and platform operations.
            </p>
          </div>
 
          <div className="flex flex-wrap gap-[10px]">
            <Link
              href="/admin/reports"
              className="inline-flex h-[42px] items-center justify-center gap-[8px] rounded-[12px] border border-[#E9D5D0] bg-white px-[16px] text-[14px] font-bold text-[#191C1E] transition hover:border-[#E07A5F] hover:text-[#E07A5F]"
            >
              View Reports
              <BarChart3 className="h-[17px] w-[17px]" />
            </Link>
 
            <Link
              href="/admin/venues"
              className="inline-flex h-[42px] items-center justify-center gap-[8px] rounded-[12px] bg-[#E07A5F] px-[16px] text-[14px] font-bold text-white transition hover:bg-[#9A442D]"
            >
              Review Venues
              <ArrowRight className="h-[17px] w-[17px]" />
            </Link>
          </div>
        </div>
      </section>
 
      {/* Stats */}
      <section className="mt-[24px] grid gap-[16px] md:grid-cols-2 xl:grid-cols-4">
        {adminStats.map((stat) => {
          const Icon = stat.icon;
 
          return (
            <div
              key={stat.title}
              className="rounded-[18px] border border-[#E9D5D0] bg-white p-[20px] shadow-sm"
            >
              <div className="mb-[16px] flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#FFF4F0] text-[#E07A5F]">
                <Icon className="h-[20px] w-[20px]" />
              </div>
 
              <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#88726D]">
                {stat.title}
              </p>
 
              <h2 className="mt-[6px] text-[28px] font-extrabold leading-[34px] text-[#191C1E]">
                {stat.value}
              </h2>
 
              <p className="mt-[6px] text-[14px] leading-[22px] text-[#55423E]">
                {stat.description}
              </p>
            </div>
          );
        })}
      </section>
 
      {/* Main Grid */}
      <div className="mt-[24px] grid gap-[24px] xl:grid-cols-[1.2fr_0.8fr]">
        {/* Admin Modules */}
        <section className="rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
          <div className="mb-[18px]">
            <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
              Admin Modules
            </h2>
 
            <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
              Quick access to major administrator tools and review areas.
            </p>
          </div>
 
          <div className="grid gap-[14px] md:grid-cols-2">
            {adminModules.map((module) => {
              const Icon = module.icon;
 
              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className="group rounded-[16px] border border-[#E9D5D0] bg-[#FFFDFC] p-[18px] transition hover:border-[#E07A5F] hover:bg-[#FFF4F0]"
                >
                  <div className="mb-[14px] flex items-center justify-between">
                    <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] bg-white text-[#E07A5F]">
                      <Icon className="h-[20px] w-[20px]" />
                    </div>
 
                    <ArrowRight className="h-[18px] w-[18px] text-[#88726D] transition group-hover:text-[#E07A5F]" />
                  </div>
 
                  <h3 className="text-[16px] font-extrabold leading-[22px] text-[#191C1E]">
                    {module.title}
                  </h3>
 
                  <p className="mt-[6px] text-[14px] leading-[22px] text-[#55423E]">
                    {module.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
 
        {/* Platform Health */}
        <section className="rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
          <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
            Platform Health
          </h2>
 
          <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
            Overview of system operations, approvals, and admin monitoring.
          </p>
 
          <div className="mt-[20px] grid gap-[12px]">
            {[
              {
                label: "Role-based access control",
                status: "Active",
                icon: ShieldCheck,
              },
              {
                label: "Venue approval workflow",
                status: "Online",
                icon: ClipboardCheck,
              },
              {
                label: "Supplier verification",
                status: "Needs Review",
                icon: BadgeCheck,
              },
              {
                label: "Reports and analytics",
                status: "Ready",
                icon: BarChart3,
              },
            ].map((item) => {
              const Icon = item.icon;
 
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-[14px] rounded-[14px] border border-[#E9D5D0] bg-[#FFFDFC] p-[14px]"
                >
                  <div className="flex items-center gap-[12px]">
                    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#FFF4F0] text-[#E07A5F]">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
 
                    <p className="text-[14px] font-bold text-[#191C1E]">
                      {item.label}
                    </p>
                  </div>
 
                  <span className="rounded-full bg-[#FFF4F0] px-[10px] py-[5px] text-[12px] font-bold text-[#E07A5F]">
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
 
      {/* Pending Reviews */}
      <section className="mt-[24px] rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
        <div className="mb-[18px] flex flex-col gap-[12px] md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
              Pending Reviews
            </h2>
 
            <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
              Latest venue and supplier submissions that need administrator
              review.
            </p>
          </div>
 
          <Link
            href="/admin/venues"
            className="inline-flex h-[40px] items-center justify-center rounded-[10px] border border-[#E9D5D0] px-[14px] text-[13px] font-bold text-[#191C1E] transition hover:border-[#E07A5F] hover:text-[#E07A5F]"
          >
            Manage Reviews
          </Link>
        </div>
 
        <div className="overflow-hidden rounded-[14px] border border-[#E9D5D0]">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-[#FFF4F0]">
              <tr>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Item
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Type
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Submitted By
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Status
                </th>
              </tr>
            </thead>
 
            <tbody>
              {pendingReviews.map((review) => (
                <tr key={review.item} className="border-t border-[#E9D5D0]">
                  <td className="px-[16px] py-[14px] text-[14px] font-bold text-[#191C1E]">
                    {review.item}
                  </td>
 
                  <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                    {review.type}
                  </td>
 
                  <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                    {review.submittedBy}
                  </td>
 
                  <td className="px-[16px] py-[14px]">
                    <span className="rounded-full bg-[#FFF4F0] px-[10px] py-[5px] text-[12px] font-bold text-[#E07A5F]">
                      {review.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
