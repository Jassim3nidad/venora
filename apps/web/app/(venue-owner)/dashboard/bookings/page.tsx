import type { Metadata } from "next";
import {
  DashboardSubPage,
  DataTable,
  DashButton,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "../_lib/owner-dashboard-data";
import { BookingFilter } from "@/src/features/booking/ui/BookingFilter";

export const metadata: Metadata = { title: "Bookings - Dashboard" };
export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  event_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  status: string;
  total_amount: number | null;
  deposit_amount: number | null;
  guest_count: number | null;
  payment_due_at: string | null;
  created_at: string | null;
  venues: { name: string; base_price: number | null } | null;
  venue_packages: { name: string; price: number; price_unit: string } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

type BookingDisplayRow = {
  id: string;
  venue: string;
  customer: string;
  date: string;
  time: string;
  guests: string;
  amount: string;
  deposit: string;
  packageName: string;
  status: string;
  requested: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";

  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return "Date not set";

  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "-";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatTime(start?: string | null, end?: string | null) {
  if (!start && !end) return "Time pending";
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? "Time pending";
}

export default async function OwnerBookingsPage(
  props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const context = await getOwnerDashboardContext();
  const { supabase } = context;
  const venueIds = await getOwnerVenueIds(context);
  const filter = (searchParams?.filter as string) || "latest";

  let query = supabase
    .from("bookings")
    .select(
      `
        id,
        event_date,
        event_start_time,
        event_end_time,
        status,
        total_amount,
        deposit_amount,
        guest_count,
        payment_due_at,
        created_at,
        venues(name, base_price),
        venue_packages(name, price, price_unit),
        profiles!customer_id(full_name, phone)
      `,
    )
    .in("venue_id", venueIds);

  if (filter === "approved") {
    query = query.eq("status", "approved").order("created_at", { ascending: false });
  } else if (filter === "declined") {
    query = query.eq("status", "declined").order("created_at", { ascending: false });
  } else if (filter === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else {
    // Default to latest
    query = query.order("created_at", { ascending: false });
  }

  const { data: bookings } = venueIds.length > 0 ? await query : { data: [] };

  const rows: BookingDisplayRow[] = ((bookings ?? []) as BookingRow[]).map(
    (booking) => ({
      id: booking.id,
      venue: booking.venues?.name ?? "-",
      customer: booking.profiles?.full_name ?? "-",
      date: formatDate(booking.event_date),
      time: formatTime(booking.event_start_time, booking.event_end_time),
      guests: booking.guest_count
        ? booking.guest_count.toLocaleString("en-PH")
        : "-",
      amount: formatCurrency(booking.total_amount),
      deposit: formatCurrency(booking.deposit_amount),
      packageName: booking.venue_packages?.name ?? "Custom quote",
      status: booking.status,
      requested: formatDate(booking.created_at),
    }),
  );

  const columns: DataTableColumn<BookingDisplayRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (row) => (
        <div>
          <span className="block font-semibold text-[#111827]">
            {row.venue}
          </span>
          <span className="mt-1 block text-xs font-medium text-[#6B7280]">
            {row.packageName}
          </span>
        </div>
      ),
    },
    { key: "customer", header: "Customer", cell: (row) => row.customer },
    {
      key: "schedule",
      header: "Schedule",
      cell: (row) => (
        <div>
          <span className="block font-semibold text-[#111827]">
            {row.date}
          </span>
          <span className="mt-1 block text-xs font-medium text-[#6B7280]">
            {row.time}
          </span>
        </div>
      ),
    },
    { key: "guests", header: "Guests", cell: (row) => row.guests },
    {
      key: "quote",
      header: "Quote",
      cell: (row) => (
        <div>
          <span className="block font-semibold text-[#111827]">
            {row.amount}
          </span>
          <span className="mt-1 block text-xs font-medium text-[#6B7280]">
            Deposit {row.deposit}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    { key: "requested", header: "Requested", cell: (row) => row.requested },
    {
      key: "action",
      header: "",
      cell: (row) => (
        <DashButton
          href={`/dashboard/bookings/${row.id}`}
          variant="secondary"
        >
          View
        </DashButton>
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Bookings"
      description="Manage reservation requests and confirmed events across your venues."
      action={
        <div className="flex items-center gap-3">
          <BookingFilter />
          <DashButton href="/dashboard/calendar" variant="secondary" icon="event">
            Calendar
          </DashButton>
        </div>
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
