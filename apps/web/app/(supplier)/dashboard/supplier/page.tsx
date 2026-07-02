import {
  BadgeCheck,
  Banknote,
  BarChart3,
  CalendarDays,
  Clock,
  MessageSquareText,
  PackageCheck,
  Star,
  Truck,
  Users,
} from "lucide-react";
import {
  DashboardCard,
  DashboardShell,
} from "@/components/dashboard/DashboardShell";

const inquiries = [
  {
    client: "Angela Santos",
    service: "Wedding Styling",
    eventDate: "Feb 18, 2026",
    status: "New",
  },
  {
    client: "Daniel Cruz",
    service: "Corporate Catering",
    eventDate: "Feb 22, 2026",
    status: "Pending",
  },
  {
    client: "Mika Reyes",
    service: "Photo and Video",
    eventDate: "Mar 2, 2026",
    status: "Replied",
  },
];

const servicePackages = [
  {
    name: "Premium Wedding Styling",
    category: "Event Styling",
    price: "₱85,000",
    status: "Active",
  },
  {
    name: "Full Catering Package",
    category: "Catering",
    price: "₱120,000",
    status: "Active",
  },
  {
    name: "Photo & Video Coverage",
    category: "Photography",
    price: "₱65,000",
    status: "Draft",
  },
];

export default function SupplierDashboardPage() {
  return (
    <DashboardShell
      title="Supplier Dashboard"
      description="Manage supplier services, packages, client inquiries, venue partnerships, and business performance."
      badge="Supplier"
    >
      {/* Summary Cards */}
      <div className="grid gap-[16px] md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Active Services"
          description="12 supplier services are currently visible to venue owners and customers."
          icon={<PackageCheck className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Client Inquiries"
          description="24 customer and venue inquiries need review or follow-up."
          icon={<MessageSquareText className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Confirmed Bookings"
          description="18 supplier bookings are confirmed for upcoming events."
          icon={<CalendarDays className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Monthly Revenue"
          description="₱245,000 estimated revenue from confirmed supplier bookings."
          icon={<Banknote className="h-[20px] w-[20px]" />}
        />
      </div>

      {/* Main Dashboard Content */}
      <div className="mt-[24px] grid gap-[24px] xl:grid-cols-[1.3fr_0.8fr]">
        {/* Inquiry Performance */}
        <section className="rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
          <div className="mb-[20px] flex items-start justify-between gap-[16px]">
            <div>
              <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
                Inquiry Performance
              </h2>
              <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
                Monthly supplier inquiries from customers and venue partners.
              </p>
            </div>

            <span className="rounded-full bg-[#FFF4F0] px-[12px] py-[6px] text-[12px] font-bold text-[#E07A5F]">
              This Year
            </span>
          </div>

          <div className="flex h-[260px] items-end gap-[12px] rounded-[16px] bg-[#FFFDFC] px-[18px] py-[20px]">
            {[28, 34, 42, 38, 55, 62, 58, 71, 66, 84, 79, 92].map(
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
            Common actions for managing supplier operations.
          </p>

          <div className="mt-[20px] grid gap-[12px]">
            {[
              "Add New Service",
              "Create Supplier Package",
              "Review Inquiries",
              "Update Availability",
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

      {/* Supplier Operations */}
      <div className="mt-[24px] grid gap-[16px] md:grid-cols-3">
        <DashboardCard
          title="Service Profiles"
          description="Manage catering, photography, styling, entertainment, rentals, and other supplier services."
          icon={<Truck className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Venue Partnerships"
          description="Track venues that include your supplier services in their packages."
          icon={<Users className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Ratings & Reviews"
          description="Monitor customer feedback, ratings, and service quality performance."
          icon={<Star className="h-[20px] w-[20px]" />}
        />
      </div>

      {/* Service Packages */}
      <section className="mt-[24px] rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
              Service Packages
            </h2>
            <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
              Supplier packages available for venue packages and direct customer inquiries.
            </p>
          </div>

          <button
            type="button"
            className="rounded-[10px] bg-[#E07A5F] px-[14px] py-[9px] text-[13px] font-bold text-white transition hover:bg-[#9A442D]"
          >
            Add Package
          </button>
        </div>

        <div className="grid gap-[14px] md:grid-cols-3">
          {servicePackages.map((item) => (
            <div
              key={item.name}
              className="rounded-[16px] border border-[#E9D5D0] bg-[#FFFDFC] p-[18px]"
            >
              <div className="mb-[14px] flex h-[40px] w-[40px] items-center justify-center rounded-[12px] bg-[#FFF4F0] text-[#E07A5F]">
                <BadgeCheck className="h-[20px] w-[20px]" />
              </div>

              <h3 className="text-[16px] font-extrabold leading-[22px] text-[#191C1E]">
                {item.name}
              </h3>

              <p className="mt-[4px] text-[13px] font-medium text-[#55423E]">
                {item.category}
              </p>

              <div className="mt-[16px] flex items-center justify-between">
                <span className="text-[16px] font-extrabold text-[#191C1E]">
                  {item.price}
                </span>

                <span className="rounded-full bg-[#FFF4F0] px-[10px] py-[5px] text-[12px] font-bold text-[#E07A5F]">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Inquiries */}
      <section className="mt-[24px] rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
              Recent Client Inquiries
            </h2>
            <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
              Latest customer and venue requests for supplier services.
            </p>
          </div>

          <button
            type="button"
            className="rounded-[10px] border border-[#E9D5D0] px-[14px] py-[9px] text-[13px] font-bold text-[#191C1E] transition hover:border-[#E07A5F] hover:text-[#E07A5F]"
          >
            View All
          </button>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[#E9D5D0]">
          <table className="w-full border-collapse bg-white text-left">
            <thead className="bg-[#FFF4F0]">
              <tr>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Client
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Service
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Event Date
                </th>
                <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {inquiries.map((inquiry) => (
                <tr
                  key={inquiry.client}
                  className="border-t border-[#E9D5D0]"
                >
                  <td className="px-[16px] py-[14px] text-[14px] font-bold text-[#191C1E]">
                    {inquiry.client}
                  </td>
                  <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                    {inquiry.service}
                  </td>
                  <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                    {inquiry.eventDate}
                  </td>
                  <td className="px-[16px] py-[14px]">
                    <span className="rounded-full bg-[#FFF4F0] px-[10px] py-[5px] text-[12px] font-bold text-[#E07A5F]">
                      {inquiry.status}
                    </span>
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
          title="Supplier Analytics"
          description="Track views, inquiries, confirmed bookings, partner venues, customer ratings, and revenue trends."
          icon={<BarChart3 className="h-[20px] w-[20px]" />}
        />

        <div className="rounded-[18px] border border-dashed border-[#E9D5D0] bg-white p-[20px] text-center shadow-sm">
          <Clock className="mx-auto mb-[12px] h-[28px] w-[28px] text-[#E07A5F]" />

          <h3 className="text-[17px] font-extrabold leading-[24px] text-[#191C1E]">
            Supplier dashboard shell ready
          </h3>

          <p className="mx-auto mt-[6px] max-w-[520px] text-[14px] leading-[22px] text-[#55423E]">
            This supplier overview page is ready to connect to supplier role data
            from Supabase.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}