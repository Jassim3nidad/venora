import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardSubPage, Panel } from "@/components/dashboard/enterprise";
import {
  getOwnerDashboardContext,
  requireCoordinatorPermission,
} from "@/src/lib/dashboard/org-dashboard-data";
import { AssignSupplierForm } from "@/src/features/booking/ui/AssignSupplierForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AssignSupplierPage({ params }: Props) {
  const { id } = await params;
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("view_assigned_bookings", context);

  const { supabase, isAdmin } = context;

  // 1. Get the booking to find its venue_id
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, venue_id, event_date")
    .eq("id", id)
    .single();

  if (!booking || !booking.venue_id) {
    notFound();
  }

  // 2. Fetch accredited suppliers assigned to this venue
  const { data: venueSuppliers } = await supabase
    .from("venue_suppliers")
    .select("supplier_profiles!inner(id, business_name, accreditation_status)")
    .eq("venue_id", booking.venue_id)
    .eq("supplier_profiles.accreditation_status", "accredited");

  // Format options for the select dropdown
  const suppliers = (venueSuppliers ?? []).map((vs: any) => ({
    id: vs.supplier_profiles.id,
    businessName: vs.supplier_profiles.business_name,
  })).sort((a: any, b: any) => a.businessName.localeCompare(b.businessName));

  return (
    <DashboardSubPage
      title="Assign Supplier"
      description="Coordinate an accredited supplier for this event booking."
      action={
        <Link
          href={`/dashboard/coordinator/bookings/${id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Booking
        </Link>
      }
    >
      <div className="mx-auto max-w-2xl">
        <Panel>
          <h2 className="mb-6 text-xl font-black tracking-tight text-[#0f172a]">
            Supplier details
          </h2>
          {suppliers.length > 0 ? (
            <AssignSupplierForm bookingId={id} suppliers={suppliers} />
          ) : (
            <p className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center text-sm font-semibold text-[#475569]">
              There are no accredited suppliers associated with this venue.
            </p>
          )}
        </Panel>
      </div>
    </DashboardSubPage>
  );
}
