import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccountForm from "./account-form";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, phone")
    .eq("id", user.id)
    .single() as any;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const userRoles = (roleRows ?? []).map((r: any) => r.role as string);

  return (
    <main className="container" style={{ paddingBlock: "4rem", maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
          My Account
        </h1>
        <a
          href="/logout"
          style={{
            height: "2.5rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            background: "rgba(220, 38, 38, 0.05)",
            color: "rgb(220, 38, 38)",
            fontWeight: 600,
            padding: "0 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontSize: "0.875rem",
            transition: "all 0.2s",
          }}
        >
          Sign Out
        </a>
      </div>

      <div className="glass" style={{ padding: "2rem", borderRadius: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, hsl(217 70% 47%), hsl(217 80% 63%))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: "1.5rem",
          }}>
            {profile?.full_name?.charAt(0) ?? user.email?.charAt(0) ?? "?"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.125rem" }}>
              {profile?.full_name ?? "—"}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{user.email}</div>
          </div>
        </div>

        <AccountForm
          initialFullName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
        />
      </div>

      {userRoles.length > 0 && (
        <div className="glass" style={{ padding: "2rem", borderRadius: "1.25rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.125rem", fontWeight: 700, marginTop: 0, marginBottom: "1.25rem" }}>
            Authorized Dashboards
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {(userRoles.includes("venue_owner") || userRoles.includes("event_coordinator")) && (
              <a
                href="/dashboard"
                style={{
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s",
                }}
              >
                🏛️ Venue Dashboard
              </a>
            )}
            {userRoles.includes("supplier") && (
              <a
                href="/dashboard/supplier"
                style={{
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s",
                }}
              >
                🎨 Supplier Dashboard
              </a>
            )}
            {userRoles.includes("admin") && (
              <a
                href="/admin"
                style={{
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s",
                }}
              >
                🛡️ Admin Panel
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
