import type { ReactNode } from "react";
import Link from "next/link";

const SIDEBAR_LINKS = [
  { href: "/dashboard/bookings",  label: "Bookings",  icon: "📅" },
  { href: "/dashboard/calendar",  label: "Calendar",  icon: "🗓️" },
  { href: "/dashboard/packages",  label: "Packages",  icon: "📦" },
  { href: "/dashboard/staff",     label: "Staff",     icon: "👥" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
];

export default function OwnerDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid var(--border-default)",
        padding: "1.5rem 1rem",
        background: "var(--bg-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}>
        <Link href="/" style={{ fontFamily: "var(--font-sora, sans-serif)", fontWeight: 700, fontSize: "1.25rem", textDecoration: "none",
          background: "linear-gradient(135deg, hsl(217 80% 63%), hsl(45 96% 54%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          marginBottom: "1.5rem", display: "block" }}>
          Venora
        </Link>
        <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem", paddingLeft: "0.75rem" }}>
          Venue Owner
        </p>
        {SIDEBAR_LINKS.map(({ href, label, icon }) => (
          <Link key={href} href={href}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", textDecoration: "none", color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
            <span>{icon}</span> {label}
          </Link>
        ))}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
