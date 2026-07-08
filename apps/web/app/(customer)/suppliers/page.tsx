import type { Metadata } from "next";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupplierList } from "@/features/suppliers/application/queries";
import { SuppliersMarketplaceClient } from "@/features/suppliers/ui/SuppliersMarketplaceClient";

export const metadata: Metadata = {
  title: "Supplier Marketplace - Venora",
  description:
    "Browse accredited event suppliers, packages, portfolio work, pricing, reviews, and contact information.",
};

export default async function SuppliersMarketplacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { suppliers, categories } = await getPublicSupplierList(supabase);

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-slate-950">
      <CustomerNavbar user={user} profile={profile} />
      <SuppliersMarketplaceClient
        initialSuppliers={suppliers}
        categories={categories}
      />
    </div>
  );
}
