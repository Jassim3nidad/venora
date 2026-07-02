import {
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageSquareText,
  PackageCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  DashboardCard,
  DashboardShell,
} from "@/components/dashboard/DashboardShell";

const upcomingEvents = [
  {
    event: "Santos–Reyes Wedding",
    venue: "The Glasshouse Estate",
    date: "Feb 18, 2026",
    status: "Final Coordination",
  },
  {
    event: "Corporate Leadership Summit",
    venue: "Azure Grand Hall",
    date: "Feb 24, 2026",
    status: "Supplier Review",
  },
  {
    event: "Debut Celebration",
    venue: "Rosewood Pavilion",
    date: "Mar 6, 2026",
    status: "Pending Confirmation",
  },
];

const supplierTasks = [
  "Confirm catering headcount",
  "Finalize photo and video schedule",
  "Review event styling package",
  "Send updated event timeline",
];

export default function EventCoordinatorDashboardPage() {
  return (
    <DashboardShell
      title="Event Coordinator Dashboard"
      description="Coordinate bookings, event timelines, venue communication, suppliers, and customer planning tasks."
      badge="Event Coordinator"
    >
      <div className="grid gap-[16px] md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Active Events"
          description="14 events are currently being coordinated."
          icon={<CalendarDays className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Pending Tasks"
          description="32 planning tasks need review or completion."
          icon={<ClipboardList className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Supplier Updates"
          description="9 supplier updates are waiting for confirmation."
          icon={<PackageCheck className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Client Messages"
          description="18 customer messages need follow-up."
          icon={<MessageSquareText className="h-[20px] w-[20px]" />}
        />
      </div>

      <div className="mt-[24px] grid gap-[24px] xl:grid-cols-[1.25fr_0.8fr]">
        <section className="rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
          <div className="mb-[18px] flex items-start justify-between gap-[16px]">
            <div>
              <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
                Upcoming Coordinated Events
              </h2>
              <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
                Track event progress, venue coordination, and client status.
              </p>
            </div>

            <span className="rounded-full bg-[#FFF4F0] px-[12px] py-[6px] text-[12px] font-bold text-[#E07A5F]">
              This Month
            </span>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-[#E9D5D0]">
            <table className="w-full border-collapse bg-white text-left">
              <thead className="bg-[#FFF4F0]">
                <tr>
                  <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                    Event
                  </th>
                  <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                    Venue
                  </th>
                  <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                    Date
                  </th>
                  <th className="px-[16px] py-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A442D]">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {upcomingEvents.map((event) => (
                  <tr key={event.event} className="border-t border-[#E9D5D0]">
                    <td className="px-[16px] py-[14px] text-[14px] font-bold text-[#191C1E]">
                      {event.event}
                    </td>
                    <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                      {event.venue}
                    </td>
                    <td className="px-[16px] py-[14px] text-[14px] text-[#55423E]">
                      {event.date}
                    </td>
                    <td className="px-[16px] py-[14px]">
                      <span className="rounded-full bg-[#FFF4F0] px-[10px] py-[5px] text-[12px] font-bold text-[#E07A5F]">
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#E9D5D0] bg-white p-[24px] shadow-sm">
          <h2 className="text-[20px] font-extrabold leading-[28px] text-[#191C1E]">
            Coordination Checklist
          </h2>

          <p className="mt-[4px] text-[14px] leading-[22px] text-[#55423E]">
            High-priority tasks for today’s event planning work.
          </p>

          <div className="mt-[20px] grid gap-[12px]">
            {supplierTasks.map((task) => (
              <div
                key={task}
                className="flex items-center gap-[12px] rounded-[14px] border border-[#E9D5D0] bg-[#FFFDFC] p-[14px]"
              >
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#FFF4F0] text-[#E07A5F]">
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                </div>

                <p className="text-[14px] font-bold leading-[20px] text-[#191C1E]">
                  {task}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-[24px] grid gap-[16px] md:grid-cols-3">
        <DashboardCard
          title="Event Timeline"
          description="Build and monitor event schedules, milestones, deadlines, and preparation tasks."
          icon={<Clock className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Client Communication"
          description="Manage inquiries, planning updates, booking changes, and event requirements."
          icon={<UsersRound className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Supplier Coordination"
          description="Coordinate catering, styling, photo and video, entertainment, and venue packages."
          icon={<Sparkles className="h-[20px] w-[20px]" />}
        />
      </div>

      <div className="mt-[24px] grid gap-[16px] md:grid-cols-2">
        <DashboardCard
          title="Coordination Analytics"
          description="Track completed tasks, active events, response time, booking progress, and client satisfaction."
          icon={<BarChart3 className="h-[20px] w-[20px]" />}
        />

        <DashboardCard
          title="Event Budget Tracking"
          description="Monitor estimated event costs, supplier fees, venue packages, and pending payments."
          icon={<Banknote className="h-[20px] w-[20px]" />}
        />
      </div>
    </DashboardShell>
  );
}