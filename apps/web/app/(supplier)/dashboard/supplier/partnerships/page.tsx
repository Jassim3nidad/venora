import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  MaterialIcon,
} from "@/components/dashboard/enterprise";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

import { SupplierAgreementsList } from "@/src/features/suppliers/ui/SupplierAgreementsList";
import { ActivePartnershipCard } from "@/src/features/suppliers/ui/ActivePartnershipCard";

export const metadata: Metadata = {
  title: "Venue Partnerships - Supplier Dashboard",
};

export const dynamic = "force-dynamic";

export default async function SupplierPartnershipsPage() {
  const { supabase, profile } = await getRequiredSupplierDashboardContext();

  if (!profile) {
    return (
      <DashboardSubPage
        title="Venue Partnerships"
        description="Venues that have added you as a preferred partner."
      >
        <div className="mx-auto max-w-lg px-4 py-12">
          <EmptyState
            icon="storefront"
            title="Profile Setup Pending"
            description="Create your supplier profile first before you can view partnerships."
          />
        </div>
      </DashboardSubPage>
    );
  }

  // Fetch partnerships
  const { data: partnerships, error } = await supabase
    .from("venue_suppliers")
    .select(`
      is_preferred,
      status,
      venues (
        id,
        name,
        city,
        province
      )
    `)
    .eq("supplier_id", profile.id);

  const { data: agreements } = await supabase
    .from("venue_supplier_agreements")
    .select(`
      *,
      venues (name)
    `)
    .eq("supplier_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[SupplierPartnerships] failed to fetch:", error.message);
  }

  const list = (partnerships ?? []) as any[];
  
  const activePartnerships = list.filter((p) => p.status === "active");
  const pendingRequests = list.filter((p) => ["application_submitted", "under_review"].includes(p.status));
  const invitations = list.filter((p) => p.status === "invited");

  return (
    <DashboardSubPage
      title="Venue Partnerships"
      description="Venues that have added you as a preferred partner for their clients."
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        {agreements && agreements.length > 0 && (
          <SupplierAgreementsList agreements={agreements} />
        )}
        
        {/* Invitations Section */}
        {invitations.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MaterialIcon name="mail" className="text-blue-600" />
              Venue Invitations
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {invitations.map((partnership, idx) => {
                const venue = partnership.venues;
                if (!venue) return null;
                return (
                  <Panel key={venue.id || idx} className="flex flex-col gap-3 border-blue-200 bg-blue-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <MaterialIcon name="mark_email_unread" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                        Invited
                      </span>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-slate-900">
                        {venue.name}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {[venue.city, venue.province].filter(Boolean).join(", ") || "Location unlisted"}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-end gap-2">
                      <button className="px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition">Decline</button>
                      <button className="px-3 py-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition">Accept Invite</button>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </section>
        )}

        {/* Active Partnerships Section */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MaterialIcon name="handshake" className="text-emerald-600" />
            Active Partnerships
          </h2>
          {activePartnerships.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activePartnerships.map((partnership, idx) => {
                const venue = partnership.venues;
                if (!venue) return null;
                
                // Find the active agreement for this venue
                const agreement = agreements?.find(a => 
                  a.venue_id === venue.id && a.status === 'active'
                );

                return (
                  <ActivePartnershipCard 
                    key={partnership.id || idx}
                    partnership={partnership}
                    agreement={agreement}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50">
              <MaterialIcon name="handshake" className="text-4xl text-slate-400 mb-2" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Partnerships</h3>
              <p className="text-sm text-slate-500">When you partner with a venue, it will appear here.</p>
            </div>
          )}
        </section>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MaterialIcon name="hourglass_empty" className="text-amber-600" />
              Pending Requests
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pendingRequests.map((partnership, idx) => {
                const venue = partnership.venues;
                if (!venue) return null;
                return (
                  <Panel key={venue.id || idx} className="flex flex-col gap-3 opacity-75">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <MaterialIcon name="pending_actions" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        {partnership.status === 'under_review' ? 'Under Review' : 'Submitted'}
                      </span>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-slate-900">
                        {venue.name}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {[venue.city, venue.province].filter(Boolean).join(", ") || "Location unlisted"}
                      </p>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardSubPage>
  );
}
