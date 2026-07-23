import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOwnerDashboardContext, requireCoordinatorPermission } from "@/src/lib/dashboard/org-dashboard-data";
import { getPublicSupplierBySlug } from "@/src/features/suppliers/application/queries";
import { SupplierDetail } from "@/src/features/suppliers/ui/SupplierDetail";
import { getCustomerBookingsForContact } from "@/src/features/suppliers/application/get-customer-bookings-for-contact";
import { isSupplierFavoritedByUser } from "@/src/features/suppliers/application/get-favorite-suppliers";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ supplierId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { supplierId } = await params;
  const context = await getOwnerDashboardContext();
  const { supabase } = context;

  const supplier = await getPublicSupplierBySlug(supabase, supplierId);

  if (!supplier) {
    return {
      title: "Supplier Not Found - Coordinator Dashboard",
    };
  }

  return {
    title: `${supplier.businessName} - Coordinator Dashboard`,
  };
}

export default async function CoordinatorSupplierDetailPage({ params }: Props) {
  const { supplierId } = await params;
  const context = await getOwnerDashboardContext();
  
  requireCoordinatorPermission("view_assigned_bookings", context);
  
  const { supabase, user } = context;

  const supplier = await getPublicSupplierBySlug(supabase, supplierId);

  if (!supplier) notFound();

  // Optionally fetch coordinator-specific bookings if needed, but for now we 
  // reuse the same component as the public marketplace for viewing profiles.
  const [bookings, isFavorited] = user
    ? await Promise.all([
        getCustomerBookingsForContact(user.id),
        isSupplierFavoritedByUser(supabase, user.id, supplier.id),
      ])
    : [[], false];

  return (
    <DashboardSubPage
      title={supplier.businessName}
      description="Supplier Profile and Services"
      action={
        <Link
          href="/dashboard/coordinator/suppliers"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SupplierDetail
          supplier={supplier}
          currentUser={user as any}
          bookings={bookings}
          isFavorited={isFavorited}
        />
      </div>
    </DashboardSubPage>
  );
}
