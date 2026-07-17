import type { OwnerDashboardContext } from "@/lib/dashboard/org-dashboard-data";

/**
 * Org owners must also appear in `organization_members`.
 * Storage and several RLS helpers key off membership rows; seed data always
 * creates both, but the dashboard create-org path previously only set owner_id.
 */
export async function ensureOwnerOrganizationMembership(
  context: Pick<OwnerDashboardContext, "supabase" | "user">,
  organizationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = context;

  const { data: owned, error: ownedError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (ownedError) {
    return { ok: false, error: ownedError.message };
  }

  if (!owned) {
    return { ok: true };
  }

  const { data: existing, error: existingError } = await supabase
    .from("organization_members")
    .select("user_id, role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existing?.role === "owner" && existing.status === "active") {
    return { ok: true };
  }

  const { error: upsertError } = await supabase
    .from("organization_members")
    .upsert(
      {
        organization_id: organizationId,
        user_id: user.id,
        role: "owner",
        status: "active",
        suspended_at: null,
        revoked_at: null,
      },
      { onConflict: "organization_id,user_id" },
    );

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  return { ok: true };
}
