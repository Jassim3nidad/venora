import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerBookingsForContact } from "@/features/suppliers/application/get-customer-bookings-for-contact";
import { isSupplierFavoritedByUser } from "@/features/suppliers/application/get-favorite-suppliers";
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
    alternates: { canonical: `/suppliers/${slug}` },
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

  const [bookings, isFavorited] = user
    ? await Promise.all([
        getCustomerBookingsForContact(user.id),
        isSupplierFavoritedByUser(supabase, user.id, supplier.id),
      ])
    : [[], false];

  return (
    <SupplierDetail
      supplier={supplier}
      currentUser={user}
      bookings={bookings}
      isFavorited={isFavorited}
    />
  );
}
