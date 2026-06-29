import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Users — Admin" };

export default async function AdminUsersPage() {
  const supabase = (await createClient()) as any;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, created_at, user_roles(role)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Users
      </h1>
      <div id="admin-users-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {(profiles ?? []).map((p: any) => (
          <div key={p.id} id={`admin-user-${p.id}`}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderRadius: "0.75rem", border: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
            <span style={{ fontWeight: 500 }}>{p.full_name ?? "—"}</span>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {((p.user_roles as any[]) ?? []).map((r: any) => (
                <span key={r.role} style={{ padding: "0.2rem 0.75rem", borderRadius: "999px", background: "hsl(217 70% 47% / 0.1)", color: "hsl(217 70% 47%)", fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize" }}>
                  {r.role}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
