import type { Metadata } from "next";
import BookingCalendar from "@/features/calendar/ui/BookingCalendar";
import { DashboardPage, PageHeader } from "@/components/dashboard/enterprise/ui";

export const metadata: Metadata = { title: "Booking Calendar — Venora Dashboard" };

export default function CalendarPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="Booking Calendar"
        description="View reserved dates, tentative holds, maintenance schedules, and blackout dates."
      />
      <div className="overflow-hidden rounded-2xl border border-[#e8deda] bg-white shadow-sm">
        <BookingCalendar />
      </div>
    </DashboardPage>
  );
}
