import { createClient } from "@/lib/supabase/server";
import type { UserPartnerApplication } from "../constants/application-progress";

export async function getLatestPartnerApplicationForUser(): Promise<UserPartnerApplication | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await (supabase.from("partner_applications") as any)
    .select(
      "id, status, role_applied_for, category, denial_reason, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return data as UserPartnerApplication;
}
