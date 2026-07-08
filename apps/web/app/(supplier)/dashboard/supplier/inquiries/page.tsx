import type { Metadata } from "next";
import {
  DashboardSubPage,
  DashButton,
  DataTable,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  formatDate,
  getRequiredSupplierDashboardContext,
} from "../_lib/supplier-dashboard-data";
import { InquiryActions } from "../_components/inquiry-actions";

export const metadata: Metadata = { title: "Inquiries - Supplier Dashboard" };
export const dynamic = "force-dynamic";

type DirectInquiryRow = {
  id: string;
  contact_name: string;
  event_date: string | null;
  event_location: string | null;
  guest_count: number | null;
  status: string;
  created_at: string;
  supplier_services: { name: string } | null;
};

type DirectInquiryDisplayRow = {
  id: string;
  client: string;
  packageName: string;
  event: string;
  guests: string;
  received: string;
  status: string;
};

type BookingInquiryRow = {
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
  const { supabase, profile } = await getRequiredSupplierDashboardContext();

  if (!profile) {
    return (
      <DashboardSubPage
        title="Inquiries"
        description="Review direct marketplace requests and venue coordination requests."
      >
        <EmptyState
          icon="storefront"
          title="Create your supplier profile first"
          description="Customer requests need a supplier profile destination before they can arrive."
          action={
            <DashButton href="/dashboard/supplier/profile" icon="storefront">
              Set Up Profile
            </DashButton>
          }
        />
      </DashboardSubPage>
    );
  }

  const [directResult, bookingResult] = await Promise.all([
    (supabase as any)
      .from("supplier_contact_requests")
      .select(
        "id, contact_name, event_date, event_location, guest_count, status, created_at, supplier_services(name)",
      )
      .eq("supplier_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50),
    (supabase as any)
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
      .eq("supplier_id", profile.id)
      .eq("status", "pending")
      .order("id", { ascending: false }),
  ]);

  if (directResult.error) {
    console.error("[supplier direct inquiries] fetch failed:", directResult.error.message);
  }

  const directRows: DirectInquiryDisplayRow[] = ((directResult.data ?? []) as DirectInquiryRow[]).map(
    (row) => ({
      id: row.id,
      client: row.contact_name,
      packageName: row.supplier_services?.name ?? "General inquiry",
      event: [formatDate(row.event_date), row.event_location]
        .filter((value) => value && value !== "-")
        .join(" / ") || "-",
      guests: row.guest_count
        ? `${row.guest_count.toLocaleString("en-PH")} guests`
        : "-",
      received: formatDate(row.created_at),
      status: row.status,
    }),
  );

  const directColumns: DataTableColumn<DirectInquiryDisplayRow>[] = [
    {
      key: "client",
      header: "Client",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.client}</p>
          <p className="text-xs text-[#6b7280]">{row.packageName}</p>
        </div>
      ),
    },
    { key: "event", header: "Event", cell: (row) => row.event },
    { key: "guests", header: "Guests", cell: (row) => row.guests },
    { key: "received", header: "Received", cell: (row) => row.received },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const bookingRows = (bookingResult.data ?? []) as BookingInquiryRow[];

  return (
    <DashboardSubPage
      title="Inquiries"
      description="Review direct marketplace requests and venue coordination requests."
    >
      <Panel>
        <PanelHeader
          title="Direct Marketplace Requests"
          description="Customer requests submitted from your public supplier profile."
        />
        {directRows.length > 0 ? (
          <DataTable
            rows={directRows}
            columns={directColumns}
            keyFn={(row) => row.id}
          />
        ) : (
          <EmptyState
            icon="mail"
            title="No direct inquiries yet"
            description="New customer requests will appear here after they contact your supplier profile."
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Pending Booking Requests"
          description="Accept to confirm your participation in venue-coordinated events."
        />
        {bookingRows.length > 0 ? (
          <div className="space-y-3">
            {bookingRows.map((inquiry) => (
              <div
                key={inquiry.id}
                className="flex flex-col gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#111827]">
                      {inquiry.bookings?.venues?.name ?? "Event"}
                    </p>
                    <StatusBadge status="pending" />
                  </div>
                  <p className="mt-1 text-sm text-[#4b5563]">
                    {inquiry.bookings?.profiles?.full_name ?? "Client"} -{" "}
                    {formatDate(inquiry.bookings?.event_date)}
                    {inquiry.bookings?.guest_count
                      ? ` - ${inquiry.bookings.guest_count} guests`
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
            title="No pending booking requests"
            description="New venue-coordinated supplier requests will show up here."
          />
        )}
      </Panel>
    </DashboardSubPage>
  );
}
