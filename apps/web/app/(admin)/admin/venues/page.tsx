import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Venue Approval — Admin" };

export default async function AdminVenuesPage() {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pending } = await supabase
    .from("venues")
    .select(`
      id,
      name,
      city,
      created_at,
      organizations (
        name,
        profiles!owner_id (
          full_name
        )
      )
    `)
    .eq("status", "pending_approval")
    .order("created_at");

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Venue Approval Queue
      </h1>
      {!pending || pending.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>✅ No pending venues.</p>
      ) : (
        <div id="admin-venues-list" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {pending.map((v: any) => (
            <div key={v.id} id={`admin-venue-${v.id}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderRadius: "0.875rem", border: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{v.name}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {v.city} · {(v.organizations as any)?.profiles?.full_name ?? "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button id={`approve-venue-${v.id}`} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: "hsl(142 71% 45%)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", fontSize: "0.875rem" }}>
                  Approve
                </button>
                <button id={`reject-venue-${v.id}`} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: "hsl(0 72% 51%)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", fontSize: "0.875rem" }}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
