import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { SupplierOverview } from "@/components/dashboard/enterprise";
import { EmptyState, DashButton } from "@/components/dashboard/enterprise";

export const metadata = {
  title: "Supplier Dashboard",
};

export default async function SupplierDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: supplierProfile } = await supabase
    .from("supplier_profiles")
    .select("id, business_name, accreditation_status")
    .eq("profile_id", user.id)
    .single();

  if (!supplierProfile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <EmptyState
          icon="storefront"
          title="Profile Setup Pending"
          description="Create your supplier profile to start listing event packages and coordination services."
          action={<DashButton>Create Supplier Profile</DashButton>}
        />
      </div>
    );
  }

  const supplierId = supplierProfile.id;

  const { count: activeServices } = await supabase
    .from("supplier_services")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId);

  const { count: clientInquiries } = await supabase
    .from("booking_suppliers")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId)
    .eq("status", "pending");

  const { count: confirmedBookings } = await supabase
    .from("booking_suppliers")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId)
    .eq("status", "confirmed");

  const { data: bookingSups } = await supabase
    .from("booking_suppliers")
    .select("agreed_price")
    .eq("supplier_id", supplierId)
    .eq("status", "confirmed");

  const monthlyRevenue = (bookingSups ?? []).reduce(
    (sum: number, s: { agreed_price: number | null }) =>
      sum + (Number(s.agreed_price) || 0),
    0,
  );

  const { data: dbServices } = await supabase
    .from("supplier_services")
    .select("id, name, price, price_unit")
    .eq("supplier_id", supplierId)
    .limit(6);

  const services = (dbServices ?? []).map(
    (s: {
      id: string;
      name: string;
      price: number | null;
      price_unit: string | null;
    }) => ({
    id: s.id,
    name: s.name,
    category: s.price_unit ? s.price_unit.replace(/_/g, " ") : "Service",
    price: s.price ? `₱${Number(s.price).toLocaleString()}` : "Contact for price",
    status: "Active",
  }));

  const { data: dbInquiries } = await supabase
    .from("booking_suppliers")
    .select(
      `
      id,
      status,
      bookings (
        event_date,
        profiles!customer_id (
          full_name
        )
      )
    `,
    )
    .eq("supplier_id", supplierId)
    .order("id", { ascending: false })
    .limit(5);

  const inquiries = (dbInquiries ?? []).map(
    (di: {
      id: string;
      status: string;
      bookings: {
        event_date: string;
        profiles: { full_name: string } | null;
      } | null;
    }) => {
    const booking = di.bookings as {
      event_date: string;
      profiles: { full_name: string } | null;
    } | null;

    return {
      id: di.id,
      client: booking?.profiles?.full_name ?? "Client Partner",
      service: supplierProfile.business_name,
      eventDate: booking?.event_date
        ? new Date(booking.event_date).toLocaleDateString("en-PH", {
            dateStyle: "medium",
          })
        : "—",
      status: di.status,
    };
  },
  );

  return (
    <SupplierOverview
      businessName={supplierProfile.business_name}
      accreditationStatus={supplierProfile.accreditation_status}
      activeServices={activeServices ?? 0}
      clientInquiries={clientInquiries ?? 0}
      confirmedBookings={confirmedBookings ?? 0}
      monthlyRevenue={monthlyRevenue}
      services={services}
      inquiries={inquiries}
    />
  );
}
