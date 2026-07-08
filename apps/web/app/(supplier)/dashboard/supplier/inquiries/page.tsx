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
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Supplier Inquiries - Dashboard" };

type InquiryRow = {
  id: string;
  contact_name: string;
  event_date: string | null;
  event_location: string | null;
  guest_count: number | null;
  status: string;
  created_at: string;
  supplier_services: { name: string } | null;
};

type InquiryDisplayRow = {
  id: string;
  client: string;
  packageName: string;
  event: string;
  guests: string;
  received: string;
  status: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default async function SupplierInquiriesPage() {
  const { supabase, profile } = await getRequiredSupplierDashboardContext();

  if (!profile) {
    return (
      <DashboardSubPage
        title="Inquiries"
        description="Review direct marketplace requests from customers."
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

  const { data, error } = await (supabase as any)
    .from("supplier_contact_requests")
    .select(
      "id, contact_name, event_date, event_location, guest_count, status, created_at, supplier_services(name)",
    )
    .eq("supplier_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[supplier inquiries] fetch failed:", error.message);
  }

  const rows: InquiryDisplayRow[] = ((data ?? []) as InquiryRow[]).map((row) => ({
    id: row.id,
    client: row.contact_name,
    packageName: row.supplier_services?.name ?? "General inquiry",
    event: [formatDate(row.event_date), row.event_location]
      .filter(Boolean)
      .join(" / "),
    guests: row.guest_count ? `${row.guest_count.toLocaleString("en-PH")} guests` : "Not set",
    received: formatDate(row.created_at),
    status: row.status,
  }));

  const columns: DataTableColumn<InquiryDisplayRow>[] = [
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

  return (
    <DashboardSubPage
      title="Inquiries"
      description="Review direct marketplace requests from customers."
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Recent inquiries"
            description="Direct supplier requests submitted from public supplier profile pages."
          />
          <DataTable rows={rows} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="mail"
          title="No inquiries yet"
          description="New customer requests will appear here after they contact your supplier profile."
        />
      )}
    </DashboardSubPage>
  );
}
