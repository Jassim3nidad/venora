import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  getOwnerDashboardContext,
  getOwnerVenueIds,
  requireCoordinatorPermission,
} from "@/src/lib/dashboard/org-dashboard-data";
import { getPublicSupplierBySlug } from "@/src/features/suppliers/application/queries";
import { SupplierDetail } from "@/src/features/suppliers/ui/SupplierDetail";
import { getCustomerBookingsForContact } from "@/src/features/suppliers/application/get-customer-bookings-for-contact";
import { isSupplierFavoritedByUser } from "@/src/features/suppliers/application/get-favorite-suppliers";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import { InviteAsVenuePartnerButton } from "@/src/features/suppliers/ui/InviteAsVenuePartnerButton";

import { CommercialAgreementsList } from "@/src/features/suppliers/ui/CommercialAgreementsList";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ supplierId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { supplierId } = await params;
  const context = await getOwnerDashboardContext();
  const { supabase } = context;

  const supplier = await getPublicSupplierBySlug(supabase, supplierId, true);

  return {
    title: supplier
      ? `${supplier.businessName} - Coordinator Dashboard`
      : "Supplier Not Found - Coordinator Dashboard",
  };
}

export default async function CoordinatorSupplierDetailPage({ params }: Props) {
  const { supplierId } = await params;
  const context = await getOwnerDashboardContext();

  requireCoordinatorPermission("view_accredited_suppliers", context);

  const { supabase, user } = context;
  const canManagePartnerships =
    context.isAdmin || context.roles.includes("venue_owner") || context.orgIds.length > 0;

  const supplier = await getPublicSupplierBySlug(supabase, supplierId, true);
  if (!supplier) notFound();

  const venueIds = await getOwnerVenueIds(context);

  // Fetch owner's venues for the partnership modal
  const ownerVenues =
    canManagePartnerships && venueIds.length > 0
      ? await supabase
          .from("venues")
          .select("id, name")
          .in("id", venueIds)
          .order("name", { ascending: true })
          .then((res: any) => res.data ?? [])
      : [];

  // Which of the owner's venues already partner with this supplier?
  const { data: existingLinks } =
    canManagePartnerships && venueIds.length > 0
      ? await supabase
          .from("venue_suppliers")
          .select("venue_id")
          .eq("supplier_id", supplier.id)
          .in("venue_id", venueIds)
      : { data: [] };

  const currentPartnerVenueIds = (existingLinks ?? []).map(
    (l: any) => l.venue_id,
  );
  
  // Fetch commercial agreements
  const { data: agreements } =
    canManagePartnerships && venueIds.length > 0
      ? await supabase
          .from("venue_supplier_agreements")
          .select("*")
          .eq("supplier_id", supplier.id)
          .in("venue_id", venueIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const [bookings, isFavorited] = user
    ? await Promise.all([
        getCustomerBookingsForContact(user.id),
        isSupplierFavoritedByUser(supabase, user.id, supplier.id),
      ])
    : [[], false];

  return (
    <DashboardSubPage
      title={supplier.businessName}
      description={
        supplier.category?.name
          ? `${supplier.category.name} · Supplier Profile`
          : "Supplier Profile and Services"
      }
      action={
        <Link
          href="/dashboard/coordinator/suppliers"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
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
          viewMode="coordinator"
          sidebarNode={
            canManagePartnerships && ownerVenues.length > 0 ? (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 shadow-sm shadow-slate-200/60">
                <h3 className="mb-2 text-lg font-bold text-slate-900">Manage Partnership</h3>
                <p className="mb-6 text-sm text-slate-500">
                  Invite this supplier to become a preferred partner for your venues.
                </p>
                <div className="w-full">
                  <InviteAsVenuePartnerButton
                    supplierId={supplier.id}
                    supplierName={supplier.businessName}
                    supplierCategory={supplier.category?.name ?? undefined}
                    ownerVenues={ownerVenues}
                    currentPartnerVenueIds={currentPartnerVenueIds}
                  />
                </div>
              </div>
            ) : null
          }
        />
        
        {canManagePartnerships && ownerVenues.length > 0 && (
          <CommercialAgreementsList 
            agreements={agreements || []}
            supplierId={supplier.id}
            supplierName={supplier.businessName}
            supplierServices={(supplier.packages || []).map(p => ({
              id: p.id,
              name: p.name,
              basePrice: p.price
            }))}
            venueId={ownerVenues[0]?.id} // Use primary selected venue
            venueName={ownerVenues[0]?.name}
            canManage={canManagePartnerships}
          />
        )}
      </div>
    </DashboardSubPage>
  );
}
