import { DashButton, EmptyState, SupplierOverview } from "@/components/dashboard/enterprise";
import { formatSupplierPrice } from "@/features/suppliers/utils/supplier-format";
import { getRequiredSupplierDashboardContext } from "./_lib/supplier-dashboard-data";
import { getRevenueTrend, lastNMonthsRange } from "@/features/analytics/application/queries";

export const metadata = {
  title: "Supplier Dashboard",
};
export const dynamic = "force-dynamic";

type ContactInquiryRow = {
  id: string;
  contact_name: string;
  event_date: string | null;
  status: string;
  supplier_services: { name: string } | null;
};

type BookingInquiryRow = {
  id: string;
  status: string;
  bookings: {
    event_date: string;
    venues: { name: string } | null;
    profiles: { full_name: string | null } | null;
  } | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default async function SupplierDashboardPage() {
  const { supabase, profile } = await getRequiredSupplierDashboardContext();

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <EmptyState
          icon="storefront"
          title="Profile Setup Pending"
          description="Create your supplier profile to start listing event packages and coordination services."
          action={
            <DashButton href="/dashboard/supplier/profile" icon="storefront">
              Create Supplier Profile
            </DashButton>
          }
        />
      </div>
    );
  }

  const supplierId = profile.id;
  const activeServices = profile.packages.filter((pkg) => pkg.isActive).length;

  const [
    directInquiryCountResult,
    bookingInquiryCountResult,
    confirmedBookingsResult,
    bookingSupsResult,
    contactResult,
    bookingInquiryResult,
  ] = await Promise.all([
    (supabase as any)
      .from("supplier_contact_requests")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId)
      .eq("status", "new"),
    (supabase as any)
      .from("booking_suppliers")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId)
      .eq("status", "pending"),
    (supabase as any)
      .from("booking_suppliers")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId)
      .eq("status", "confirmed"),
    (supabase as any)
      .from("booking_suppliers")
      .select("agreed_price")
      .eq("supplier_id", supplierId)
      .eq("status", "confirmed"),
    (supabase as any)
      .from("supplier_contact_requests")
      .select("id, contact_name, event_date, status, supplier_services(name)")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .limit(3),
    (supabase as any)
      .from("booking_suppliers")
      .select(
        `
        id,
        status,
        bookings (
          event_date,
          venues(name),
          profiles!customer_id(full_name)
        )
      `,
      )
      .eq("supplier_id", supplierId)
      .eq("status", "pending")
      .order("id", { ascending: false })
      .limit(3),
  ]);

  const revenueTrend = await getRevenueTrend(
    supabase,
    { kind: "supplier", supplierId },
    lastNMonthsRange(12),
  );

  const monthlyRevenue = (bookingSupsResult.data ?? []).reduce(
    (sum: number, row: { agreed_price: number | null }) =>
      sum + (Number(row.agreed_price) || 0),
    0,
  );

  const services = profile.packages.slice(0, 6).map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    category: pkg.packageType.replace(/_/g, " "),
    price: formatSupplierPrice(pkg.price),
    status: pkg.isActive ? "Active" : "Archived",
  }));

  const directInquiries = ((contactResult.data ?? []) as ContactInquiryRow[]).map(
    (row) => ({
      id: row.id,
      client: row.contact_name,
      service: row.supplier_services?.name ?? "General inquiry",
      eventDate: formatDate(row.event_date),
      status: row.status,
    }),
  );

  const bookingInquiries = ((bookingInquiryResult.data ?? []) as BookingInquiryRow[]).map(
    (row) => ({
      id: row.id,
      client: row.bookings?.profiles?.full_name ?? "Client",
      service: row.bookings?.venues?.name ?? "Venue request",
      eventDate: formatDate(row.bookings?.event_date),
      status: row.status,
    }),
  );

  return (
    <SupplierOverview
      businessName={profile.businessName}
      accreditationStatus={profile.accreditationStatus}
      activeServices={activeServices}
      clientInquiries={
        (directInquiryCountResult.count ?? 0) +
        (bookingInquiryCountResult.count ?? 0)
      }
      confirmedBookings={confirmedBookingsResult.count ?? 0}
      monthlyRevenue={monthlyRevenue}
      services={services}
      inquiries={[...directInquiries, ...bookingInquiries]}
      revenueTrend={revenueTrend}
    />
  );
}
