import type { Metadata } from "next";

export const metadata: Metadata = { title: "Supplier Dashboard" };

export default function SupplierDashboardPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Supplier Dashboard
      </h1>
      <p style={{ color: "var(--text-muted)" }}>
        Manage your supplier profile, service listings, and booking requests here.
      </p>
    </main>
  );
}
