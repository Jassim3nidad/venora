import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

/**
 * Shared across every dashboard route group that operates on
 * organization-scoped data (venue owner AND event coordinator "staff"
 * dashboards). Coordinators are added to `organization_members` with
 * role `coordinator`, which grants them the same data access as the
 * venue owner via RLS (`is_org_member`) — this helper mirrors that.
 */
export type OwnerDashboardContext = {
  // Supabase's generated relationship types are incomplete in this app, so the
  // owner dashboard keeps these server queries narrow and runtime-shaped.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  user: { id: string; email?: string | null };
  orgIds: string[];
  roles: string[];
  isAdmin: boolean;
};

export async function getOwnerDashboardContext(): Promise<OwnerDashboardContext> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row: { role: string }) => row.role);

  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = (members ?? []).map(
    (member: { organization_id: string }) => member.organization_id,
  );

  return {
    supabase,
    user,
    orgIds,
    roles,
    isAdmin: roles.includes("admin"),
  };
}

export async function getOwnerVenueIds(context: OwnerDashboardContext) {
  const { supabase, orgIds, isAdmin } = context;

  if (!isAdmin && orgIds.length === 0) return [];

  let query = supabase.from("venues").select("id");
  if (!isAdmin) query = query.in("organization_id", orgIds);

  const { data } = await query;
  return (data ?? []).map((venue: { id: string }) => venue.id);
}

export async function getOwnerVenueById(
  context: OwnerDashboardContext,
  id: string,
  select = "*",
) {
  const { supabase, orgIds, isAdmin } = context;

  if (!isAdmin && orgIds.length === 0) return null;

  let query = supabase.from("venues").select(select).eq("id", id);
  if (!isAdmin) query = query.in("organization_id", orgIds);

  const { data } = await query.maybeSingle();
  return data ?? null;
}

export function formatPeso(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(Number(amount))) return "-";
  return `PHP ${Number(amount).toLocaleString("en-PH")}`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}
