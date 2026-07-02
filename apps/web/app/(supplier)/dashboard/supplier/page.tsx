import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
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

export const metadata = {
  title: "Supplier Dashboard",
  description: "Manage supplier services, packages, client inquiries, venue partnerships, and business performance.",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(45 96% 54%)",
  confirmed: "hsl(142 71% 45%)",
  cancelled: "hsl(0 72% 51%)",
};

export default async function SupplierDashboardPage() {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch supplier profile
  const { data: supplierProfile } = await supabase
    .from("supplier_profiles")
    .select("id, business_name, accreditation_status")
    .eq("profile_id", user.id)
    .single();

  if (!supplierProfile) {
    // Graceful onboarding state for new suppliers
    return (
      <DashboardShell
        role="supplier"
        title="Supplier Dashboard"
        description="Set up your supplier profile to get discovered by venue owners and event planners."
        badge="Supplier Onboarding"
      >
        <div className="rounded-[18px] border border-dashed border-[#E9D5D0] bg-white p-[40px] text-center shadow-sm">
          <Truck className="mx-auto mb-[16px] h-[48px] w-[48px] text-[#E07A5F]" />
          <h3 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
            Profile Setup Pending
          </h3>
          <p className="mx-auto mt-[8px] max-w-[500px] text-[14px] leading-[22px] text-[#55423E]">
            You don't have an active supplier profile yet. Create your supplier profile
            to start listing event packages, coordination services, catering packages, and more.
          </p>
          <button
            type="button"
            className="mt-[20px] rounded-[10px] bg-[#E07A5F] px-[16px] py-[10px] text-[14px] font-bold text-white transition hover:bg-[#9A442D]"
          >
            Create Supplier Profile
          </button>
        </div>
      </DashboardShell>
    );
  }

  const supplierId = supplierProfile.id;

  // Active Services count
  const { count: activeServices } = await supabase
    .from("supplier_services")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId);

  // Client Inquiries (pending booking_suppliers)
  const { count: clientInquiries } = await supabase
    .from("booking_suppliers")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId)
    .eq("status", "pending");

  // Confirmed Bookings
  const { count: confirmedBookings } = await supabase
    .from("booking_suppliers")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId)
    .eq("status", "confirmed");

  // Monthly Revenue (agreed price of confirmed bookings)
  const { data: bookingSups } = await supabase
    .from("booking_suppliers")
    .select("agreed_price")
    .eq("supplier_id", supplierId)
    .eq("status", "confirmed");

  const monthlyRevenue = (bookingSups ?? []).reduce(
    (sum: number, s: any) => sum + (Number(s.agreed_price) || 0),
    0
  );

  // Fetch list of services/packages
  const { data: dbServices } = await supabase
    .from("supplier_services")
    .select("id, name, price, price_unit, description")
    .eq("supplier_id", supplierId)
    .limit(6);

  const servicePackages = (dbServices ?? []).map((s: any) => ({
    name: s.name,
    category: s.price_unit ? s.price_unit.replace("_", " ") : "Service",
    price: s.price ? `₱${s.price.toLocaleString()}` : "Contact for price",
    status: "Active",
  }));

  // Fetch recent client inquiries (join booking_suppliers with bookings & profiles)
  const { data: dbInquiries } = await supabase
    .from("booking_suppliers")
    .select(`
      id,
      status,
      agreed_price,
      bookings (
        event_date,
        profiles!customer_id (
          full_name
        )
      )
    `)
    .eq("supplier_id", supplierId)
    .order("id", { ascending: false })
    .limit(5);

  const inquiries = (dbInquiries ?? []).map((di: any) => ({
    client: di.bookings?.profiles?.full_name ?? "Client Partner",
    service: supplierProfile.business_name || "Supplier Service",
    eventDate: di.bookings?.event_date
      ? new Date(di.bookings.event_date).toLocaleDateString("en-PH", { dateStyle: "medium" })
      : "—",
    status: di.status,
  }));

  return (
    <DashboardShell
      role="supplier"
      title={`${supplierProfile.business_name} Dashboard`}
      description="Manage supplier services, packages, client inquiries, venue partnerships, and business performance."
      badge={`Supplier Profile: ${supplierProfile.accreditation_status}`}
    >
      {/* Summary Cards */}
      <div className="grid gap-[16px] md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Active Services"
          description={`${activeServices ?? 0} service package${activeServices !== 1 ? "s" : ""} currently listed.`}
          icon={<PackageCheck className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Client Inquiries"
          description={`${clientInquiries ?? 0} request${clientInquiries !== 1 ? "s" : ""} require your review.`}
          icon={<MessageSquareText className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Confirmed Bookings"
          description={`${confirmedBookings ?? 0} confirmed event booking${confirmedBookings !== 1 ? "s" : ""} secured.`}
          icon={<CalendarDays className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Monthly Revenue"
          description={`₱${monthlyRevenue.toLocaleString()} from confirmed packages.`}
          icon={<Banknote className="h-[20px] w-[20px]" />}
        />
      </div>

      {/* Main Dashboard Content */}
      <div className="mt-[24px] grid gap-[24px] xl:grid-cols-[1.3fr_0.8fr]">
        {/* Inquiry Performance Placeholder */}
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
            {[10, 15, 12, 18, 22, 25, 20, 28, 24, 30, 26, 34].map(
              (height, index) => (
                <div
                  key={index}
                  className="flex flex-1 flex-col items-center gap-[8px]"
                >
                  <div
                    className="w-full max-w-[20px] rounded-t-[6px] bg-[#E07A5F]/80"
                    style={{ height: `${height * 5}px` }}
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
          {!servicePackages || servicePackages.length === 0 ? (
            <div className="col-span-3 text-center py-[24px] text-[14px] text-[#55423E] border border-dashed border-[#E9D5D0] rounded-[16px]">
              No service packages found. Click Add Package to get started.
            </div>
          ) : (
            servicePackages.map((item: any) => (
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

                <p className="mt-[4px] text-[13px] font-medium text-[#55423E] capitalize">
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
            ))
          )}
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
              {!inquiries || inquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-[24px] text-[14px] text-[#55423E]">
                    No recent inquiries found.
                  </td>
                </tr>
              ) : (
                inquiries.map((inquiry: any, index: number) => (
                  <tr
                    key={index}
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
                      <span
                        className="rounded-full px-[10px] py-[5px] text-[12px] font-bold capitalize"
                        style={{
                          background: `${STATUS_COLORS[inquiry.status] ?? "hsl(217 70% 47%)"}20`,
                          color: STATUS_COLORS[inquiry.status] ?? "hsl(217 70% 47%)",
                        }}
                      >
                        {inquiry.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
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
            Real-time Sync Active
          </h3>

          <p className="mx-auto mt-[6px] max-w-[520px] text-[14px] leading-[22px] text-[#55423E]">
            This supplier overview dashboard is fully integrated with live supplier profiles,
            listed services, and booking partnerships.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}