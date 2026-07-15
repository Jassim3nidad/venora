import { isAdminUser } from "@/lib/rbac/guards";

/**
 * App-level ownership check mirroring the RLS `is_org_member_for_venue`
 * policy. Used to determine if the user owns or manages the venue.
 */
export async function userOwnsVenue(
  supabase: any,
  userId: string,
  venueId: string,
): Promise<boolean> {
  if (!userId || !venueId) return false;

  if (await isAdminUser(supabase, userId)) return true;

  // We should check organizations where owner_id = userId
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId);

  const orgIds = (orgs ?? []).map((org: { id: string }) => org.id);

  // We also check if they are in organization_members
  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);

  const memberOrgIds = (members ?? []).map(
    (member: { organization_id: string }) => member.organization_id,
  );

  const allOrgIds = Array.from(new Set([...orgIds, ...memberOrgIds]));

  if (allOrgIds.length === 0) return false;

  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("id", venueId)
    .in("organization_id", allOrgIds)
    .maybeSingle();

  return !!venue;
}
