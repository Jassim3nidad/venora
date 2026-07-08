import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupplierBySlug } from "@/features/suppliers/application/queries";
import { SupplierDetail } from "@/features/suppliers/ui/SupplierDetail";

type SupplierDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: SupplierDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const supplier = await getPublicSupplierBySlug(supabase, slug);

  if (!supplier) {
    return {
      title: "Supplier Not Found - Venora",
    };
  }

  return {
    title: `${supplier.businessName} - Supplier Profile`,
    description:
      supplier.headline ??
      supplier.description ??
      "Accredited Venora supplier profile.",
  };
}

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const supplier = await getPublicSupplierBySlug(supabase, slug);

  if (!supplier) notFound();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-slate-950">
      <CustomerNavbar user={user} profile={profile} />
      <SupplierDetail supplier={supplier} currentUser={user} />
    </div>
  );
}
