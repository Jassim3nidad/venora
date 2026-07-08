import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  formatDate,
  getSupplierDashboardContext,
} from "../_lib/supplier-dashboard-data";
import { InquiryActions } from "../_components/inquiry-actions";

export const metadata: Metadata = { title: "Inquiries - Supplier Dashboard" };
export const dynamic = "force-dynamic";

type InquiryRow = {
  id: string;
  status: string;
  bookings: {
    event_date: string;
    guest_count: number | null;
    venues: { name: string } | null;
    profiles: { full_name: string | null } | null;
  } | null;
};

export default async function SupplierInquiriesPage() {
  const { supabase, supplierProfile } = await getSupplierDashboardContext();

  if (!supplierProfile) {
    return (
      <DashboardSubPage title="Inquiries" description="Set up your supplier profile first.">
        <EmptyState
          icon="mail"
          title="Profile setup pending"
          description="Create your supplier profile from the overview page to start receiving inquiries."
        />
      </DashboardSubPage>
    );
  }

  const { data: inquiriesRaw } = await supabase
    .from("booking_suppliers")
    .select(
      `
        id,
        status,
        bookings (
          event_date,
          guest_count,
          venues(name),
          profiles!customer_id(full_name)
        )
      `,
    )
    .eq("supplier_id", supplierProfile.id)
    .eq("status", "pending")
    .order("id", { ascending: false });

  const rows = (inquiriesRaw ?? []) as InquiryRow[];

  return (
    <DashboardSubPage
      title="Inquiries"
      description="Pending requests from venues and customers waiting on your response."
    >
      <Panel>
        <PanelHeader
          title="Pending Inquiries"
          description="Accept to confirm your participation in the event, or decline if you're unavailable."
        />
        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((inquiry) => (
              <div
                key={inquiry.id}
                className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#111827]">
                      {inquiry.bookings?.venues?.name ?? "Event"}
                    </p>
                    <StatusBadge status="pending" />
                  </div>
                  <p className="mt-1 text-sm text-[#4b5563]">
                    {inquiry.bookings?.profiles?.full_name ?? "Client"} &middot;{" "}
                    {formatDate(inquiry.bookings?.event_date)}
                    {inquiry.bookings?.guest_count
                      ? ` · ${inquiry.bookings.guest_count} guests`
                      : ""}
                  </p>
                </div>
                <InquiryActions bookingSupplierId={inquiry.id} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="mail"
            title="No pending inquiries"
            description="New requests from venues coordinating events will show up here."
          />
        )}
      </Panel>
    </DashboardSubPage>
  );
}
