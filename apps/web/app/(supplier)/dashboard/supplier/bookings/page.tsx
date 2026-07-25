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

export const metadata: Metadata = { title: "Jobs - Supplier Dashboard" };
export const dynamic = "force-dynamic";

type BookingEmbed = {
  event_date: string;
  guest_count: number | null;
  venues: { name: string } | { name: string }[] | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

type BookingSupplierRow = {
  id: string;
  agreed_price: number | null;
  status: string;
  bookings: BookingEmbed | BookingEmbed[] | null;
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

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapJobRow(row: BookingSupplierRow): BookingDisplayRow {
  const booking = asOne(row.bookings);
  const venue = asOne(booking?.venues ?? null);
  const profile = asOne(booking?.profiles ?? null);

  return {
    id: row.id,
    venue: venue?.name ?? "-",
    client: profile?.full_name ?? "-",
    date: formatDate(booking?.event_date),
    guests: booking?.guest_count ? `${booking.guest_count} guests` : "-",
    price: formatPeso(row.agreed_price),
    status: row.status,
  };
}

export default async function SupplierBookingsPage() {
  const { supabase, supplierProfile } = await getSupplierDashboardContext();

  if (!supplierProfile) {
    return (
      <DashboardSubPage
        title="Jobs"
        description="Set up your supplier profile first."
      >
        <EmptyState
          icon="event_available"
          title="Profile setup pending"
          description="Create your supplier profile from the overview page to start tracking confirmed bookings."
        />
      </DashboardSubPage>
    );
  }

  const { data: bookingsRaw, error } = await supabase
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
    .in("status", ["pending", "confirmed"])
    .order("id", { ascending: false });

  if (error) {
    console.error("[supplier jobs] fetch failed:", error.message);
  }

  const rows: BookingDisplayRow[] = (
    (bookingsRaw ?? []) as BookingSupplierRow[]
  ).map(mapJobRow);

  const columns: DataTableColumn<BookingDisplayRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.venue}</span>
      ),
    },
    { key: "client", header: "Client", cell: (row) => row.client },
    { key: "date", header: "Event Date", cell: (row) => row.date },
    { key: "guests", header: "Guests", cell: (row) => row.guests },
    {
      key: "price",
      header: "Agreed Price",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.price}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <DashboardSubPage
      title="Jobs"
      description="Events where you are attached as a supplier."
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Active Jobs"
            description="Confirmed and pending supplier jobs attached to venue bookings."
          />
          <DataTable rows={rows} keyFn={(row) => row.id} columns={columns} />
        </Panel>
      ) : (
        <EmptyState
          icon="event_available"
          title="No jobs yet"
          description="When a venue owner or coordinator attaches you to a booking, or a customer accepts your quote on a linked booking, it appears here."
        />
      )}
    </DashboardSubPage>
  );
}
