import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Packages — Dashboard" };

export default async function PackagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700 }}>Packages</h1>
        <button id="add-package-btn" style={{ padding: "0.625rem 1.25rem", borderRadius: "0.625rem", background: "hsl(217 70% 47%)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer" }}>
          + Add Package
        </button>
      </div>
      <p style={{ color: "var(--text-muted)" }}>Manage your venue packages here.</p>
    </main>
  );
}
