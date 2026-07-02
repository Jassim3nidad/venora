import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { SupplierOverview } from "@/components/dashboard/enterprise";

export const metadata = {
  title: "Supplier Dashboard",
  description:
    "Manage supplier services, packages, inquiries, and business performance.",
};

export default async function SupplierDashboardPage() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: supplierProfile } = await supabase
    .from("supplier_profiles")
    .select("id, business_name")
    .eq("profile_id", user.id)
    .single();

  const { count: confirmedBookings } = supplierProfile
    ? await supabase
        .from("booking_suppliers")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", supplierProfile.id)
        .eq("status", "confirmed")
    : { count: 0 };

  const { data: bookingSups } = supplierProfile
    ? await supabase
        .from("booking_suppliers")
        .select("agreed_price")
        .eq("supplier_id", supplierProfile.id)
        .eq("status", "confirmed")
    : { data: [] };

  const expectedEarnings = (bookingSups ?? []).reduce(
    (sum: number, s: any) => sum + (Number(s.agreed_price) || 0),
    0,
  );

  return (
    <SupplierOverview
      businessName={supplierProfile?.business_name ?? "Your Business"}
      expectedEarnings={`₱${expectedEarnings.toLocaleString()}`}
      activeJobs={confirmedBookings ?? 0}
    />
  );
}
