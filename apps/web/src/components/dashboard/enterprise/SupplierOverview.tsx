import {
  DashboardPage,
  DashButton,
  DataTable,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
} from "./ui";
import { MaterialIcon } from "./MaterialIcon";

export type SupplierOverviewProps = {
  businessName: string;
  accreditationStatus: string;
  activeServices: number;
  clientInquiries: number;
  confirmedBookings: number;
  monthlyRevenue: number;
  services: Array<{
    id: string;
    name: string;
    category: string;
    price: string;
    status: string;
  }>;
  inquiries: Array<{
    id: string;
    client: string;
    service: string;
    eventDate: string;
    status: string;
  }>;
};

export function SupplierOverview({
  businessName,
  accreditationStatus,
  activeServices,
  clientInquiries,
  confirmedBookings,
  monthlyRevenue,
  services,
  inquiries,
}: SupplierOverviewProps) {
  const kpis = [
    {
      label: "Active Services",
      value: String(activeServices),
      icon: "design_services",
      highlight: true,
    },
    {
      label: "Client Inquiries",
      value: String(clientInquiries),
      icon: "mail",
    },
    {
      label: "Confirmed Bookings",
      value: String(confirmedBookings),
      icon: "event_available",
    },
    {
      label: "Monthly Revenue",
      value: `₱${monthlyRevenue.toLocaleString()}`,
      icon: "payments",
    },
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#88726d]">Supplier Portal</p>
          <h1 className="font-display text-2xl font-bold text-[#191c1e] sm:text-3xl">
            {businessName}
          </h1>
          <p className="mt-1 text-sm text-[#55423e]">
            Accreditation:{" "}
            <span className="font-semibold capitalize text-[#9a442d]">
              {accreditationStatus}
            </span>
          </p>
        </div>
        <DashButton icon="add">Add Service</DashButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <PanelHeader
            title="Inquiry Performance"
            description="Monthly supplier inquiries from customers and venue partners."
            action={
              <span className="rounded-full bg-[#fff4f0] px-3 py-1 text-xs font-bold text-[#9a442d]">
                This Year
              </span>
            }
          />
          <div className="flex h-40 items-end gap-2 rounded-xl bg-[#fffdfc] p-4">
            {[10, 15, 12, 18, 22, 25, 20, 28, 24, 30, 26, 34].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-[#9a442d]/70"
                style={{ height: `${h * 4}px` }}
              />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Quick Actions" />
          <div className="grid gap-2">
            {[
              "Add New Service",
              "Review Inquiries",
              "Update Availability",
              "View Analytics",
            ].map((action) => (
              <button
                key={action}
                type="button"
                className="flex items-center justify-between rounded-xl border border-[#e8deda] px-4 py-3 text-left text-sm font-semibold text-[#191c1e] transition hover:border-[#9a442d] hover:bg-[#fff4f0] hover:text-[#9a442d]"
              >
                {action}
                <MaterialIcon name="chevron_right" />
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Service Packages"
          description="Packages available for venue partnerships and direct inquiries."
          action={<DashButton variant="secondary">Add Package</DashButton>}
        />
        {services.length === 0 ? (
          <EmptyState
            icon="inventory_2"
            title="No service packages yet"
            description="Create your first package to get discovered by venue owners."
            action={<DashButton>Add Package</DashButton>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {services.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#e8deda] bg-[#fffdfc] p-4"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4f0] text-[#9a442d]">
                  <MaterialIcon name="verified" />
                </div>
                <p className="font-semibold text-[#191c1e]">{item.name}</p>
                <p className="mt-1 text-sm capitalize text-[#55423e]">
                  {item.category}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold text-[#191c1e]">{item.price}</span>
                  <StatusBadge status="active" label={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel padding={false} className="overflow-hidden">
        <div className="border-b border-[#e8deda] p-5 sm:p-6">
          <PanelHeader
            title="Recent Client Inquiries"
            description="Latest requests for your supplier services."
          />
        </div>
        <div className="p-5 sm:p-6">
          <DataTable
            rows={inquiries}
            keyFn={(r) => r.id}
            emptyMessage="No recent inquiries found."
            columns={[
              {
                key: "client",
                header: "Client",
                cell: (r) => (
                  <span className="font-semibold text-[#191c1e]">{r.client}</span>
                ),
              },
              { key: "service", header: "Service", cell: (r) => r.service },
              { key: "date", header: "Event Date", cell: (r) => r.eventDate },
              {
                key: "status",
                header: "Status",
                cell: (r) => <StatusBadge status={r.status} />,
              },
            ]}
          />
        </div>
      </Panel>
    </DashboardPage>
  );
}
