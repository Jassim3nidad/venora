import {
  DashboardPage,
  DashButton,
  DataTable,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
} from "./ui";
import { MaterialIcon } from "./MaterialIcon";
import { getMarketplaceResearchVenues } from "@/src/features/venues/data/research-venues";

const coordinatorVenues = getMarketplaceResearchVenues().slice(0, 3);

const UPCOMING_EVENTS = [
  {
    id: "1",
    event: "Santos-Reyes Wedding",
    venue: coordinatorVenues[0]?.name ?? "Venue",
    date: "Feb 18, 2026",
    status: "Final Coordination",
  },
  {
    id: "2",
    event: "Corporate Leadership Summit",
    venue: coordinatorVenues[1]?.name ?? "Venue",
    date: "Feb 24, 2026",
    status: "Supplier Review",
  },
  {
    id: "3",
    event: "Debut Celebration",
    venue: coordinatorVenues[2]?.name ?? "Venue",
    date: "Mar 6, 2026",
    status: "Pending Confirmation",
  },
];

const CHECKLIST = [
  "Confirm catering headcount",
  "Finalize photo and video schedule",
  "Review event styling package",
  "Send updated event timeline",
];

const MANAGED_VENUES = coordinatorVenues.map((venue, index) => ({
  name: venue.name,
  events: [4, 2, 1][index] ?? 1,
  status: index === 2 ? "pending" : "active",
}));

export function CoordinatorOverview() {
  const kpis = [
    { label: "Active Events", value: "14", icon: "celebration", highlight: true },
    { label: "Pending Tasks", value: "32", icon: "checklist" },
    { label: "Supplier Updates", value: "9", icon: "storefront" },
    { label: "Client Messages", value: "18", icon: "mail" },
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#6b7280]">Event Coordinator</p>
          <h1 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">
            Coordination Hub
          </h1>
        </div>
        <DashButton icon="add">New Event</DashButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel padding={false} className="overflow-hidden">
          <div className="border-b border-[#e5e7eb] p-5 sm:p-6">
            <PanelHeader
              title="Upcoming Coordinated Events"
              description="Track event progress, venue coordination, and client status."
            />
          </div>
          <div className="p-5 sm:p-6">
            <DataTable
              rows={UPCOMING_EVENTS}
              keyFn={(r) => r.id}
              columns={[
                {
                  key: "event",
                  header: "Event",
                  cell: (r) => (
                    <span className="font-semibold text-[#111827]">{r.event}</span>
                  ),
                },
                { key: "venue", header: "Venue", cell: (r) => r.venue },
                { key: "date", header: "Date", cell: (r) => r.date },
                {
                  key: "status",
                  header: "Status",
                  cell: (r) => <StatusBadge status="pending" label={r.status} />,
                },
              ]}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Coordination Checklist"
            description="High-priority tasks for today."
          />
          <div className="space-y-3">
            {CHECKLIST.map((task) => (
              <div
                key={task}
                className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]">
                  <MaterialIcon name="check_circle" className="text-lg" />
                </div>
                <p className="text-sm font-semibold text-[#111827]">{task}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Managed Venues"
          description="Venues under your coordination portfolio."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {MANAGED_VENUES.map((venue) => (
            <div
              key={venue.name}
              className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1d4ed8]">
                <MaterialIcon name="location_city" />
              </div>
              <p className="font-semibold text-[#111827]">{venue.name}</p>
              <p className="mt-1 text-sm text-[#4b5563]">
                {venue.events} active event{venue.events !== 1 ? "s" : ""}
              </p>
              <div className="mt-3">
                <StatusBadge status={venue.status} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </DashboardPage>
  );
}
