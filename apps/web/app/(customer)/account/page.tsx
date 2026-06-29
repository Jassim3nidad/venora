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

  return (
    <main className="container" style={{ paddingBlock: "4rem", maxWidth: 640 }}>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "2rem" }}>
        My Account
      </h1>

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
    </main>
  );
}
