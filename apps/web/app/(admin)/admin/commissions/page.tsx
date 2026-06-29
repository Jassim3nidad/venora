import type { Metadata } from "next";

export const metadata: Metadata = { title: "Commissions — Admin" };

export default function AdminCommissionsPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Commission Management
      </h1>
      <p style={{ color: "var(--text-muted)" }}>Set commission rates and view platform earnings.</p>
    </main>
  );
}
