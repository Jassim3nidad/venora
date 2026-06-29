import type { ReactNode } from "react";
import Link from "next/link";

const ADMIN_NAV = [
  { href: "/admin/venues",      label: "Venues",      icon: "🏛️" },
  { href: "/admin/suppliers",   label: "Suppliers",   icon: "🎨" },
  { href: "/admin/users",       label: "Users",       icon: "👥" },
  { href: "/admin/commissions", label: "Commissions", icon: "💰" },
  { href: "/admin/reports",     label: "Reports",     icon: "📊" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      <aside style={{ width: 240, borderRight: "1px solid var(--border-default)", padding: "1.5rem 1rem", background: "hsl(217 50% 15%)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <Link href="/" style={{ fontFamily: "var(--font-sora, sans-serif)", fontWeight: 700, fontSize: "1.25rem", textDecoration: "none", color: "#fff", marginBottom: "1.5rem", display: "block" }}>
          Venora Admin
        </Link>
        <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "hsl(217 30% 60%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem", paddingLeft: "0.75rem" }}>Management</p>
        {ADMIN_NAV.map(({ href, label, icon }) => (
          <Link key={href} href={href}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", textDecoration: "none", color: "hsl(217 30% 80%)", fontSize: "0.875rem", fontWeight: 500 }}>
            <span>{icon}</span> {label}
          </Link>
        ))}
      </aside>
      <div style={{ flex: 1, padding: "2rem", overflow: "auto" }}>{children}</div>
    </div>
  );
}
