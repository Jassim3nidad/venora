import { SupplierOverview } from "@/components/dashboard/enterprise";
import { DashButton, EmptyState } from "@/components/dashboard/enterprise";
import { formatSupplierPrice } from "@/features/suppliers/utils/supplier-format";
import { getRequiredSupplierDashboardContext } from "./_lib/supplier-dashboard-data";

export const metadata = {
  title: "Supplier Dashboard",
};

type ContactInquiryRow = {
  id: string;
  contact_name: string;
  event_date: string | null;
  status: string;
  supplier_services: { name: string } | null;
};

function formatDate(value: string | null) {
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

  const [{ count: clientInquiries }, { count: confirmedBookings }, bookingSupsResult, contactResult] =
    await Promise.all([
      (supabase as any)
        .from("supplier_contact_requests")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierId)
        .eq("status", "new"),
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
        .select(
          "id, contact_name, event_date, status, supplier_services(name)",
        )
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

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

  const inquiries = ((contactResult.data ?? []) as ContactInquiryRow[]).map(
    (row) => ({
      id: row.id,
      client: row.contact_name,
      service: row.supplier_services?.name ?? "General inquiry",
      eventDate: formatDate(row.event_date),
      status: row.status,
    }),
  );

  return (
    <SupplierOverview
      businessName={profile.businessName}
      accreditationStatus={profile.accreditationStatus}
      activeServices={activeServices}
      clientInquiries={clientInquiries ?? 0}
      confirmedBookings={confirmedBookings ?? 0}
      monthlyRevenue={monthlyRevenue}
      services={services}
      inquiries={inquiries}
    />
  );
}
