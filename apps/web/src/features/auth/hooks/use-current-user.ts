import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "../types/auth.types";

export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, phone, status")
          .eq("id", session.user.id)
          .single() as any;

        // Fetch roles
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        const roles = (roleRows ?? [])
          .map((row: any) => row.role)
          .filter(Boolean);

        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          fullName: profile?.full_name ?? "",
          avatarUrl: profile?.avatar_url ?? null,
          phone: profile?.phone ?? null,
          status: (profile?.status as any) ?? "pending_verification",
          roles: roles as any[],
        });
      } catch (err) {
        console.error("Error fetching current user:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        fetchUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
