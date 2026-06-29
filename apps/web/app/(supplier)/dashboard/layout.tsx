import type { ReactNode } from "react";
import Link from "next/link";

export default function SupplierLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      <aside style={{ width: 220, borderRight: "1px solid var(--border-default)", padding: "1.5rem 1rem", background: "var(--bg-subtle)" }}>
        <Link href="/" style={{ fontFamily: "var(--font-sora, sans-serif)", fontWeight: 700, fontSize: "1.25rem", textDecoration: "none",
          background: "linear-gradient(135deg, hsl(217 80% 63%), hsl(45 96% 54%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: "1.5rem", display: "block" }}>
          Venora
        </Link>
        <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem", paddingLeft: "0.75rem" }}>Supplier</p>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", textDecoration: "none", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          🏷️ Overview
        </Link>
      </aside>
      <div style={{ flex: 1, padding: "2rem" }}>{children}</div>
    </div>
  );
}
