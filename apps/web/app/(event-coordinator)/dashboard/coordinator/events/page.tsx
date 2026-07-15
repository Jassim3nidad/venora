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
  formatPeso,
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "@/lib/dashboard/org-dashboard-data";

export const metadata: Metadata = { title: "Events - Coordinator Dashboard" };
export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  event_date: string | null;
  status: string;
  total_amount: number | null;
  guest_count: number | null;
  venues: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

type EventDisplayRow = {
  id: string;
  venue: string;
  customer: string;
  date: string;
  guests: string;
  amount: string;
  status: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

export default async function CoordinatorEventsPage() {
  const context = await getOwnerDashboardContext();
  const { supabase } = context;
  const venueIds = await getOwnerVenueIds(context);

  const { data: bookings } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select(
            `
              id,
              event_date,
              status,
              total_amount,
              guest_count,
              venues(name),
              profiles!customer_id(full_name)
            `,
          )
          .in("venue_id", venueIds)
          .order("event_date", { ascending: false })
      : { data: [] };

  const rows: EventDisplayRow[] = ((bookings ?? []) as BookingRow[]).map(
    (b) => ({
      id: b.id,
      venue: b.venues?.name ?? "-",
      customer: b.profiles?.full_name ?? "-",
      date: formatDate(b.event_date),
      guests: b.guest_count
        ? `${b.guest_count.toLocaleString("en-PH")} guests`
        : "-",
      amount: formatPeso(b.total_amount),
      status: b.status,
    }),
  );

  const columns: DataTableColumn<EventDisplayRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.venue}</span>
      ),
    },
    { key: "customer", header: "Client", cell: (row) => row.customer },
    { key: "date", header: "Event Date", cell: (row) => row.date },
    { key: "guests", header: "Guests", cell: (row) => row.guests },
    {
      key: "amount",
      header: "Quote",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.amount}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "action",
      header: "",
      cell: (row) => (
        <DashButton
          href={`/dashboard/bookings/${row.id}`}
          variant="secondary"
          icon="visibility"
          className="px-3 py-2 text-xs"
        >
          View
        </DashButton>
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Events"
      description="Every booking across the venues your organization coordinates."
      action={
        <DashButton
          href="/dashboard/coordinator/calendar"
          variant="secondary"
          icon="event"
        >
          Calendar
        </DashButton>
      }
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Event Pipeline"
            description="Open a booking to review guest details, quotes, and status history."
          />
          <DataTable rows={rows} keyFn={(row) => row.id} columns={columns} />
        </Panel>
      ) : (
        <EmptyState
          icon="celebration"
          title="No events yet"
          description="Bookings made for the venues you coordinate will appear here."
        />
      )}
    </DashboardSubPage>
  );
}
