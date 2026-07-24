import {
  DashboardPage,
  DashButton,
  DataTable,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "./ui";
import { MaterialIcon } from "./MaterialIcon";

export type CoordinatorEventRow = {
  id: string;
  eventName: string;
  venue: string;
  date: string;
  guests: string;
  status: string;
};

export type CoordinatorVenueRow = {
  id: string;
  name: string;
  eventCount: number;
  status: string;
};

import { CoordinatorInvitations, type CoordinatorInvitationRow } from "./CoordinatorInvitations";

export type CoordinatorOverviewProps = {
  coordinatorName: string;
  organizationName?: string | null;
  venueCount: number;
  upcomingEventCount: number;
  pendingEventCount: number;
  eventsTodayCount: number;
  unreadMessageCount: number;
  calendarConflictCount: number;
  accreditedSupplierCount: number;
  approvalRate: string;
  upcomingEvents: CoordinatorEventRow[];
  managedVenues: CoordinatorVenueRow[];
  pendingInvitations?: CoordinatorInvitationRow[];
};

const QUICK_LINKS = [
  {
    label: "Manage Bookings",
    href: "/dashboard/coordinator/bookings",
    icon: "calendar_month",
  },
  {
    label: "Review Venues",
    href: "/dashboard/coordinator/venues",
    icon: "location_city",
  },
  {
    label: "Find Suppliers",
    href: "/dashboard/coordinator/suppliers",
    icon: "storefront",
  },
  {
    label: "View Reports",
    href: "/dashboard/coordinator/reports",
    icon: "assessment",
  },
];

export function CoordinatorOverview({
  coordinatorName,
  organizationName,
  venueCount,
  upcomingEventCount,
  pendingEventCount,
  eventsTodayCount,
  unreadMessageCount,
  calendarConflictCount,
  accreditedSupplierCount,
  approvalRate,
  upcomingEvents,
  managedVenues,
  pendingInvitations = [],
}: CoordinatorOverviewProps) {
  const kpis = [
    {
      label: "Upcoming Bookings",
      value: String(upcomingEventCount),
      icon: "event",
      highlight: true,
    },
    {
      label: "Awaiting Action",
      value: String(pendingEventCount),
      icon: "pending_actions",
    },
    {
      label: "Events Today",
      value: String(eventsTodayCount),
      icon: "today",
    },
    {
      label: "Assigned Venues",
      value: String(venueCount),
      icon: "location_city",
    },
    {
      label: "Unread Messages",
      value: String(unreadMessageCount),
      icon: "forum",
    },
    {
      label: "Calendar Conflicts",
      value: String(calendarConflictCount),
      icon: "event_busy",
    },
    {
      label: "Accredited Suppliers",
      value: String(accreditedSupplierCount),
      icon: "storefront",
    },
    {
      label: "Approval Rate",
      value: approvalRate,
      icon: "trending_up",
    },
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#6b7280]">
            {organizationName ?? "Event Coordinator"}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">
            Welcome back, {coordinatorName}
          </h1>
        </div>
        <DashButton href="/dashboard/coordinator/bookings" icon="celebration">
          View Events
        </DashButton>
      </div>

      <CoordinatorInvitations invitations={pendingInvitations} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel padding={false} className="overflow-hidden">
          <div className="border-b border-[#e5e7eb] p-5 sm:p-6">
            <PanelHeader
              title="Upcoming Events"
              description="Bookings across the venues your organization coordinates."
            />
          </div>
          <div className="p-5 sm:p-6">
            {upcomingEvents.length > 0 ? (
              <DataTable
                rows={upcomingEvents}
                keyFn={(r) => r.id}
                columns={[
                  {
                    key: "event",
                    header: "Venue",
                    cell: (r) => (
                      <span className="font-semibold text-[#111827]">
                        {r.venue}
                      </span>
                    ),
                  },
                  { key: "date", header: "Date", cell: (r) => r.date },
                  { key: "guests", header: "Guests", cell: (r) => r.guests },
                  {
                    key: "status",
                    header: "Status",
                    cell: (r) => <StatusBadge status={r.status} />,
                  },
                ]}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-[#e5e7eb] px-6 py-10 text-center text-sm text-[#4b5563]">
                No upcoming events yet. Events will appear here once your
                organization's venues receive bookings.
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Quick Actions"
            description="Jump straight into your coordination tools."
          />
          <div className="grid gap-2">
            {QUICK_LINKS.map((link) => (
              <DashButton
                key={link.href}
                href={link.href}
                variant="secondary"
                className="justify-between"
              >
                <span className="flex items-center gap-2">
                  <MaterialIcon name={link.icon} className="text-lg" />
                  {link.label}
                </span>
                <MaterialIcon name="chevron_right" />
              </DashButton>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Managed Venues"
          description="Venues under your coordination portfolio."
          action={
            <DashButton
              href="/dashboard/coordinator/venues"
              variant="secondary"
              icon="location_city"
            >
              View All
            </DashButton>
          }
        />
        {managedVenues.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {managedVenues.slice(0, 3).map((venue) => (
              <div
                key={venue.id}
                className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1d4ed8]">
                  <MaterialIcon name="location_city" />
                </div>
                <p className="font-semibold text-[#111827]">{venue.name}</p>
                <p className="mt-1 text-sm text-[#4b5563]">
                  {venue.eventCount} active event
                  {venue.eventCount !== 1 ? "s" : ""}
                </p>
                <div className="mt-3">
                  <StatusBadge status={venue.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="location_city"
            title="No venues yet"
            description="Ask your organization owner to add you as a coordinator on their venues."
          />
        )}
      </Panel>
    </DashboardPage>
  );
}

export type { DataTableColumn };
