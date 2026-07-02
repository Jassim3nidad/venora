import type { Metadata } from "next";
import BookingCalendar from "@/features/calendar/ui/BookingCalendar";

export const metadata: Metadata = { title: "Booking Calendar — Venora Dashboard" };

export default function CalendarPage() {
  return (
    <main style={{ padding: "0" }}>
      <BookingCalendar />
    </main>
  );
}
