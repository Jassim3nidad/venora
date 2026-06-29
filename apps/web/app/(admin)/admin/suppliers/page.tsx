import type { Metadata } from "next";

export const metadata: Metadata = { title: "Suppliers — Admin" };

export default function AdminSuppliersPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Supplier Accreditation Queue
      </h1>
      <p style={{ color: "var(--text-muted)" }}>Review and accredit supplier applications.</p>
    </main>
  );
}
