import { notFound } from "next/navigation";
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
  requireCoordinatorPermission("coordinate_accredited_suppliers", context);

  const { supabase } = context;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, venue_id, event_date")
    .eq("id", id)
    .single();

  if (!booking || !booking.venue_id) {
    notFound();
  }

  const [{ data: venueSuppliers }, { data: attached }] = await Promise.all([
    supabase
      .from("venue_suppliers")
      .select("supplier_profiles!inner(id, business_name, accreditation_status)")
      .eq("venue_id", booking.venue_id)
      .eq("supplier_profiles.accreditation_status", "accredited"),
    supabase
      .from("booking_suppliers")
      .select("supplier_id, status")
      .eq("booking_id", id),
  ]);

  const attachedIds = new Set(
    (attached ?? [])
      .filter((row: { status: string }) => row.status !== "cancelled")
      .map((row: { supplier_id: string }) => row.supplier_id),
  );

  const suppliers = (venueSuppliers ?? [])
    .map((vs: any) => ({
      id: vs.supplier_profiles.id as string,
      businessName: vs.supplier_profiles.business_name as string,
    }))
    .filter((supplier: { id: string }) => !attachedIds.has(supplier.id))
    .sort((a: { businessName: string }, b: { businessName: string }) =>
      a.businessName.localeCompare(b.businessName),
    );

  const returnTo = `/dashboard/coordinator/bookings/${id}`;

  return (
    <DashboardSubPage
      title="Attach Supplier"
      description="Attach an accredited venue supplier to this booking as a confirmed job."
      action={
        <Link
          href={returnTo}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Booking
        </Link>
      }
    >
      <div className="mx-auto max-w-2xl">
        <Panel>
          <h2 className="mb-6 text-xl font-bold tracking-tight text-[#0f172a]">
            Supplier job details
          </h2>
          {suppliers.length > 0 ? (
            <AssignSupplierForm
              bookingId={id}
              suppliers={suppliers}
              returnTo={returnTo}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center text-sm font-semibold text-[#475569]">
              No available accredited suppliers for this venue. Associate
              suppliers on the venue first, or all associated suppliers are
              already attached.
            </p>
          )}
        </Panel>
      </div>
    </DashboardSubPage>
  );
}
