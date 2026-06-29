import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics — Dashboard" };

const STAT_CARDS = [
  { label: "Total Revenue",   value: "₱0",  icon: "💰", change: "—" },
  { label: "Total Bookings",  value: "0",   icon: "📅", change: "—" },
  { label: "Avg. Rating",     value: "—",   icon: "⭐", change: "—" },
  { label: "Occupancy Rate",  value: "0%",  icon: "📊", change: "—" },
];

export default function AnalyticsPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Analytics
      </h1>

      <div id="analytics-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {STAT_CARDS.map((card) => (
          <div key={card.label} style={{ padding: "1.5rem", borderRadius: "0.875rem", border: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>{card.value}</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 300, borderRadius: "1rem", border: "1px solid var(--border-default)", background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        Revenue chart — integrate Recharts or Chart.js
      </div>
    </main>
  );
}
