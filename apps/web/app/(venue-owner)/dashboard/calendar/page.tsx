import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendar — Dashboard" };

export default function CalendarPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Booking Calendar
      </h1>
      <div id="calendar-placeholder" style={{ height: 500, borderRadius: "1rem", border: "1px solid var(--border-default)", background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>📅</div>
          <p style={{ marginTop: "0.5rem" }}>Calendar view — integrate with react-big-calendar or FullCalendar</p>
        </div>
      </div>
    </main>
  );
}
