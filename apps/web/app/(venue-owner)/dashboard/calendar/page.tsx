import type { Metadata } from "next";
import BookingCalendar from "@/features/calendar/ui/BookingCalendar";
import { DashboardSubPage } from "@/components/dashboard/enterprise";

export const metadata: Metadata = { title: "Booking Calendar — Venora Dashboard" };

export default function CalendarPage() {
  return (
    <DashboardSubPage
      title="Booking Calendar"
      description="View reserved dates, tentative reservations, and upcoming events."
    >
      <BookingCalendar />
    </DashboardSubPage>
  );
}
