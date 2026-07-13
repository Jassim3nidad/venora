import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupplierList } from "@/features/suppliers/application/queries";
import { SuppliersMarketplaceClient } from "@/features/suppliers/ui/SuppliersMarketplaceClient";

export const metadata: Metadata = {
  title: "Supplier Marketplace - Venora",
  description:
    "Browse accredited event suppliers, packages, portfolio work, pricing, reviews, and contact information.",
  alternates: { canonical: "/suppliers" },
};

export default async function SuppliersMarketplacePage() {
  const supabase = await createClient();
  const { suppliers, categories } = await getPublicSupplierList(supabase);

  return (
    <SuppliersMarketplaceClient
      initialSuppliers={suppliers}
      categories={categories}
    />
  );
}
