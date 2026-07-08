import type { Metadata } from "next";
import {
  DashboardSubPage,
  DataTable,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  formatDate,
  formatPeso,
  getSupplierDashboardContext,
} from "../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Bookings - Supplier Dashboard" };
export const dynamic = "force-dynamic";

type BookingSupplierRow = {
  id: string;
  agreed_price: number | null;
  status: string;
  bookings: {
    event_date: string;
    guest_count: number | null;
    venues: { name: string } | null;
    profiles: { full_name: string | null } | null;
  } | null;
};

type BookingDisplayRow = {
  id: string;
  venue: string;
  client: string;
  date: string;
  guests: string;
  price: string;
  status: string;
};

export default async function SupplierBookingsPage() {
  const { supabase, supplierProfile } = await getSupplierDashboardContext();

  if (!supplierProfile) {
    return (
      <DashboardSubPage title="Bookings" description="Set up your supplier profile first.">
        <EmptyState
          icon="event_available"
          title="Profile setup pending"
          description="Create your supplier profile from the overview page to start tracking confirmed bookings."
        />
      </DashboardSubPage>
    );
  }

  const { data: bookingsRaw } = await supabase
    .from("booking_suppliers")
    .select(
      `
        id,
        agreed_price,
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
    .eq("status", "confirmed")
    .order("id", { ascending: false });

  const rows: BookingDisplayRow[] = ((bookingsRaw ?? []) as BookingSupplierRow[]).map((b) => ({
    id: b.id,
    venue: b.bookings?.venues?.name ?? "-",
    client: b.bookings?.profiles?.full_name ?? "-",
    date: formatDate(b.bookings?.event_date),
    guests: b.bookings?.guest_count ? `${b.bookings.guest_count} guests` : "-",
    price: formatPeso(b.agreed_price),
    status: b.status,
  }));

  const columns: DataTableColumn<BookingDisplayRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (row) => <span className="font-semibold text-[#111827]">{row.venue}</span>,
    },
    { key: "client", header: "Client", cell: (row) => row.client },
    { key: "date", header: "Event Date", cell: (row) => row.date },
    { key: "guests", header: "Guests", cell: (row) => row.guests },
    {
      key: "price",
      header: "Agreed Price",
      cell: (row) => <span className="font-semibold text-[#111827]">{row.price}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <DashboardSubPage
      title="Bookings"
      description="Confirmed events you're providing services for."
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Confirmed Bookings"
            description="These are inquiries you've accepted."
          />
          <DataTable rows={rows} keyFn={(row) => row.id} columns={columns} />
        </Panel>
      ) : (
        <EmptyState
          icon="event_available"
          title="No confirmed bookings yet"
          description="Accept a pending inquiry to see it appear here."
        />
      )}
    </DashboardSubPage>
  );
}
