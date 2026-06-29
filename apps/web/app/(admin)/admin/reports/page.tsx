import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports — Admin" };

export default function AdminReportsPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Reports
      </h1>
      <p style={{ color: "var(--text-muted)" }}>Platform-wide reports and CSV exports.</p>
    </main>
  );
}
