import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  MaterialIcon,
  Panel,
} from "@/components/dashboard/enterprise";
import {
  getOwnerDashboardContext,
  getOwnerVenueIds,
  requireCoordinatorPermission,
} from "@/lib/dashboard/org-dashboard-data";
import Link from "next/link";
import { formatPeso } from "@/lib/dashboard/org-dashboard-data";
import { ReviewPartnershipActions } from "./ReviewPartnershipActions";

export const metadata: Metadata = {
  title: "Pending Requests - Coordinator Dashboard",
};
export const dynamic = "force-dynamic";

export default async function CoordinatorSupplierRequestsPage() {
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("view_accredited_suppliers", context);
  const { supabase } = context;

  const venueIds = await getOwnerVenueIds(context);

  if (venueIds.length === 0) {
    return (
      <DashboardSubPage
        title="Partnership Requests"
        description="Review incoming requests from suppliers."
      >
        <EmptyState icon="pending_actions" title="No venues assigned" description="You must be assigned to a venue to receive requests." />
      </DashboardSubPage>
    );
  }

  const { data: requests } = await supabase
    .from("venue_suppliers")
    .select(`
      *,
      supplier:supplier_profiles (
        id,
        business_name,
        description
      ),
      venue:venues(name)
    `)
    .in("venue_id", venueIds)
    .in("status", ["application_submitted", "under_review"]);

  const list = (requests ?? []) as any[];

  return (
    <DashboardSubPage
      title="Partnership Requests"
      description="Review incoming requests from suppliers who want to partner with your venues."
      action={
        <Link
          href="/dashboard/coordinator/suppliers"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
        >
          <MaterialIcon name="arrow_back" className="text-lg" />
          Back to Suppliers
        </Link>
      }
    >
      {list.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((request) => {
              const supplier = request.supplier;
              if (!supplier) return null;

              return (
                <Panel key={request.id} className="flex flex-col gap-3 border-amber-200 bg-amber-50/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <MaterialIcon name="person_add" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      Pending
                    </span>
                  </div>
                  <div>
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      target="_blank"
                      title="View supplier profile"
                      className="group flex w-fit items-center gap-1.5 font-display text-lg font-bold text-slate-900 transition hover:text-blue-700"
                    >
                      <span className="group-hover:underline">{supplier.business_name}</span>
                      <MaterialIcon name="open_in_new" className="text-[16px] text-slate-400 transition group-hover:text-blue-700" />
                    </Link>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">
                      For venue: {request.venue?.name}
                    </p>
                  </div>
                  {request.commercial_terms && (
                    <div className="mt-2 text-sm text-slate-600 italic bg-white p-3 rounded-lg border border-amber-100">
                      "{request.commercial_terms}"
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-amber-100 pt-3">
                    <ReviewPartnershipActions requestId={request.id} supplierId={supplier.id} />
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-lg px-4 py-12">
          <EmptyState
            icon="check_circle"
            title="All caught up!"
            description="You have no pending partnership requests to review."
          />
        </div>
      )}
    </DashboardSubPage>
  );
}
