import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff — Dashboard" };

export default function StaffPage() {
  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Staff Management</h1>
      <p style={{ color: "var(--text-muted)" }}>Invite and manage your venue staff here.</p>
    </main>
  );
}
