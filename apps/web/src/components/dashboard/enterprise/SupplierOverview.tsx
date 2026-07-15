import { formatCurrency } from "@venora/lib";
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
import { RevenueTrendChart, type RevenueTrendPoint } from "./charts";

export type SupplierOverviewProps = {
  businessName: string;
  accreditationStatus: string;
  activeServices: number;
  clientInquiries: number;
  pendingQuotes: number;
  acceptedJobs: number;
  averageRating: number;
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
  revenueTrend: RevenueTrendPoint[];
};

export function SupplierOverview({
  businessName,
  accreditationStatus,
  activeServices,
  clientInquiries,
  pendingQuotes,
  acceptedJobs,
  averageRating,
  monthlyRevenue,
  services,
  inquiries,
  revenueTrend,
}: SupplierOverviewProps) {
  const kpis = [
    {
      label: "New Inquiries",
      value: String(clientInquiries),
      icon: "mail",
      highlight: true,
    },
    {
      label: "Pending Quotes",
      value: String(pendingQuotes),
      icon: "request_quote",
    },
    {
      label: "Accepted Jobs",
      value: String(acceptedJobs),
      icon: "event_available",
    },
    {
      label: "Average Rating",
      value: averageRating > 0 ? averageRating.toFixed(1) : "-",
      icon: "star",
    },
    {
      label: "Active Services",
      value: String(activeServices),
      icon: "design_services",
    },
  ];

  const quickActions = [
    { label: "Add New Service", href: "/dashboard/supplier/services" },
    { label: "Review Inquiries", href: "/dashboard/supplier/inquiries" },
    { label: "Manage Quotes", href: "/dashboard/supplier/quotes" },
    { label: "Update Availability", href: "/dashboard/supplier/calendar" },
    { label: "View Jobs", href: "/dashboard/supplier/bookings" },
    { label: "View Analytics", href: "/dashboard/supplier/analytics" },
    { label: "Update Profile", href: "/dashboard/supplier/profile" },
    { label: "Add Portfolio Work", href: "/dashboard/supplier/portfolio" },
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#6b7280]">
            Supplier Portal
          </p>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <PanelHeader
            title="Revenue Performance"
            description={`Confirmed supplier revenue: ${formatCurrency(monthlyRevenue)}.`}
            action={
              <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1d4ed8]">
                This Year
              </span>
            }
          />
          <RevenueTrendChart data={revenueTrend} format="currency" />
        </Panel>

        <Panel>
          <PanelHeader title="Quick Actions" />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {quickActions.map((action) => (
              <DashButton
                key={action.href}
                href={action.href}
                variant="secondary"
                className="justify-between"
              >
                {action.label}
                <MaterialIcon name="chevron_right" />
              </DashButton>
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
            action={
              <DashButton href="/dashboard/supplier/services">
                Add Package
              </DashButton>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {services.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                  <MaterialIcon name="verified" />
                </div>
                <p className="font-semibold text-[#111827]">{item.name}</p>
                <p className="mt-1 text-sm capitalize text-[#4b5563]">
                  {item.category}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="font-bold text-[#111827]">{item.price}</span>
                  <StatusBadge
                    status={item.status.toLowerCase()}
                    label={item.status}
                  />
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
            keyFn={(row) => row.id}
            emptyMessage="No recent inquiries found."
            columns={[
              {
                key: "client",
                header: "Client",
                cell: (row) => (
                  <span className="font-semibold text-[#111827]">
                    {row.client}
                  </span>
                ),
              },
              { key: "service", header: "Service", cell: (row) => row.service },
              {
                key: "date",
                header: "Event Date",
                cell: (row) => row.eventDate,
              },
              {
                key: "status",
                header: "Status",
                cell: (row) => <StatusBadge status={row.status} />,
              },
            ]}
          />
        </div>
      </Panel>
    </DashboardPage>
  );
}
