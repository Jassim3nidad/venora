import type { Metadata } from "next";
import Link from "next/link";
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
  venue_name_snapshot: string | null;
  event_start_time_snapshot: string | null;
  location_snapshot: string | null;
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

export default async function SupplierInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const filters = await searchParams;
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

  const q = filters.q?.trim() ?? "";
  const status = ["new", "responded", "closed"].includes(filters.status ?? "")
    ? filters.status
    : undefined;
  const sort = filters.sort === "event_date" ? "event_date" : "created_at";
  let directQuery = (supabase as any)
    .from("supplier_contact_requests")
    .select(
      "id, contact_name, event_date, event_location, guest_count, status, created_at, supplier_services(name), venue_name_snapshot, event_start_time_snapshot, location_snapshot",
    )
    .eq("supplier_id", profile.id);
  if (q) directQuery = directQuery.ilike("contact_name", `%${q}%`);
  if (status) directQuery = directQuery.eq("status", status);
  directQuery = directQuery.order(sort, { ascending: false }).limit(50);

  const [directResult, bookingResult] = await Promise.all([
    directQuery,
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
    (row) => {
      const eventLocation = row.venue_name_snapshot || row.location_snapshot || row.event_location;
      
      const timeStr = row.event_start_time_snapshot 
        ? new Date(`1970-01-01T${row.event_start_time_snapshot}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : null;
        
      const eventDateTimeParts = [formatDate(row.event_date), timeStr].filter(Boolean);
      const eventDateTime = eventDateTimeParts.length > 0 ? eventDateTimeParts.join(" at ") : null;
      
      return {
        id: row.id,
        client: row.contact_name,
        packageName: row.supplier_services?.name ?? "General inquiry",
        event: [eventDateTime, eventLocation]
          .filter((value) => value && value !== "-")
          .join(" / ") || "-",
        guests: row.guest_count
          ? `${row.guest_count.toLocaleString("en-PH")} guests`
          : "-",
        received: formatDate(row.created_at),
        status: row.status,
      };
    },
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
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <Link
          href={`/dashboard/supplier/inquiries/${row.id}`}
          className="font-bold text-[#1d4ed8] hover:underline"
        >
          View details
        </Link>
      ),
    },
  ];

  const bookingRows = (bookingResult.data ?? []) as BookingInquiryRow[];

  return (
    <DashboardSubPage
      title="Inquiries"
      description="Review direct marketplace requests and venue coordination requests."
    >
      <Panel>
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <input name="q" defaultValue={q} placeholder="Search customer" className="min-h-11 rounded-2xl border border-[#dbe3ef] px-4 text-sm" />
          <select name="status" defaultValue={status ?? ""} className="min-h-11 rounded-2xl border border-[#dbe3ef] px-4 text-sm"><option value="">All statuses</option><option value="new">New</option><option value="responded">Responded</option><option value="closed">Closed</option></select>
          <select name="sort" defaultValue={sort === "event_date" ? "event_date" : "newest"} className="min-h-11 rounded-2xl border border-[#dbe3ef] px-4 text-sm"><option value="newest">Newest first</option><option value="event_date">Event date</option></select>
          <button type="submit" className="min-h-11 rounded-2xl bg-[#1d4ed8] px-5 text-sm font-bold text-white">Apply</button>
        </form>
      </Panel>
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
