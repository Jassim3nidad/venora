import type { Metadata } from "next";
import {
  DashboardSubPage,
  DataTable,
  StatusBadge,
  DashButton,
  Panel,
  PanelHeader,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  formatDate,
  formatPeso,
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "../_lib/owner-dashboard-data";

export const metadata: Metadata = { title: "Bookings - Dashboard" };

type BookingRow = {
  id: string;
  event_date: string;
  status: string;
  total_amount: number | null;
  guest_count: number;
  created_at: string;
  venues: { name: string } | null;
  profiles: { full_name: string } | null;
};

type BookingDisplayRow = {
  id: string;
  venue: string;
  customer: string;
  date: string;
  guests: number;
  amount: string;
  status: string;
  requested: string;
};

export default async function OwnerBookingsPage() {
  const context = await getOwnerDashboardContext();
  const { supabase } = context;
  const venueIds = await getOwnerVenueIds(context);

  const { data: bookings } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select(
            "id, event_date, status, total_amount, guest_count, created_at, venues(name), profiles!customer_id(full_name)",
          )
          .in("venue_id", venueIds)
          .order("event_date", { ascending: false })
      : { data: [] };

  const rows: BookingDisplayRow[] = (bookings ?? []).map((booking: BookingRow) => ({
    id: booking.id,
    venue: booking.venues?.name ?? "-",
    customer: booking.profiles?.full_name ?? "-",
    date: formatDate(booking.event_date),
    guests: booking.guest_count,
    amount: formatPeso(booking.total_amount),
    status: booking.status,
    requested: formatDate(booking.created_at),
  }));

  const columns: DataTableColumn<BookingDisplayRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.venue}</span>
      ),
    },
    { key: "customer", header: "Customer", cell: (row) => row.customer },
    { key: "date", header: "Event Date", cell: (row) => row.date },
    { key: "guests", header: "Guests", cell: (row) => row.guests },
    {
      key: "amount",
      header: "Amount",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.amount}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    { key: "requested", header: "Requested", cell: (row) => row.requested },
  ];

  return (
    <DashboardSubPage
      title="Bookings"
      description="Manage reservation requests and confirmed events across your venues."
      action={
        <DashButton href="/dashboard/calendar" variant="secondary" icon="event">
          Calendar
        </DashButton>
      }
    >
      <Panel>
        <PanelHeader
          title="Reservation Pipeline"
          description="Only bookings for venues owned by your organization appear here."
        />
        <DataTable
          rows={rows}
          keyFn={(row) => row.id}
          emptyMessage="No bookings found for your venues yet."
          columns={columns}
        />
      </Panel>
    </DashboardSubPage>
  );
}
