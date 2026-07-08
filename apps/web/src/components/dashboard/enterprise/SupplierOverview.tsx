import Link from "next/link";
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
          <p className="text-sm font-semibold text-[#6b7280]">Supplier Portal</p>
          <h1 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">
            {businessName}
          </h1>
          <p className="mt-1 text-sm text-[#4b5563]">
            Accreditation:{" "}
            <span className="font-semibold capitalize text-[#1d4ed8]">
              {accreditationStatus}
            </span>
          </p>
        </div>
        <DashButton href="/dashboard/supplier/services" icon="add">
          Add Service
        </DashButton>
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
              <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1d4ed8]">
                This Year
              </span>
            }
          />
          <div className="flex h-40 items-end gap-2 rounded-xl bg-[#f9fafb] p-4">
            {[10, 15, 12, 18, 22, 25, 20, 28, 24, 30, 26, 34].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-[#1d4ed8]/70"
                style={{ height: `${h * 4}px` }}
              />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Quick Actions" />
          <div className="grid gap-2">
            {[
              { label: "Add New Service", href: "/dashboard/supplier/services" },
              { label: "Review Inquiries", href: "/dashboard/supplier/inquiries" },
              { label: "View Confirmed Bookings", href: "/dashboard/supplier/bookings" },
              { label: "View Analytics", href: "/dashboard/supplier/analytics" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between rounded-xl border border-[#e5e7eb] px-4 py-3 text-left text-sm font-semibold text-[#111827] transition hover:border-[#1d4ed8] hover:bg-[#eff6ff] hover:text-[#1d4ed8]"
              >
                {action.label}
                <MaterialIcon name="chevron_right" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Service Packages"
          description="Packages available for venue partnerships and direct inquiries."
          action={
            <DashButton href="/dashboard/supplier/services" variant="secondary">
              Manage Services
            </DashButton>
          }
        />
        {services.length === 0 ? (
          <EmptyState
            icon="inventory_2"
            title="No service packages yet"
            description="Create your first package to get discovered by venue owners."
            action={<DashButton href="/dashboard/supplier/services">Add Package</DashButton>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {services.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1d4ed8]">
                  <MaterialIcon name="verified" />
                </div>
                <p className="font-semibold text-[#111827]">{item.name}</p>
                <p className="mt-1 text-sm capitalize text-[#4b5563]">
                  {item.category}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold text-[#111827]">{item.price}</span>
                  <StatusBadge status="active" label={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel padding={false} className="overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5 sm:p-6">
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
                  <span className="font-semibold text-[#111827]">{r.client}</span>
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
