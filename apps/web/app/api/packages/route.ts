import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/packages?venueId=...&q=...
 * Returns packages the current authenticated owner/coordinator can see,
 * optionally filtered by venueId and search query. Also returns a simple
 * count map of packages per venue to power filter badges.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: { code: "AUTH_REQUIRED", message: "Authentication required" } }, { status: 401 });
    }

    // Resolve organization IDs where user is active member or owner
    const [{ data: memberRows }, { data: owned }] = await Promise.all([
      supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase.from("organizations").select("id").eq("owner_id", user.id),
    ]);

    const memberOrgIds = (memberRows ?? []).map((r: any) => r.organization_id);
    const ownedOrgIds = (owned ?? []).map((o: any) => o.id);
    const orgIds = Array.from(new Set([...memberOrgIds, ...ownedOrgIds]));

    if (orgIds.length === 0) {
      return NextResponse.json({ success: true, data: { packages: [], counts: {} } });
    }

    const url = new URL(request.url);
    const venueId = url.searchParams.get("venueId");
    const q = url.searchParams.get("q");

    // Fetch venue ids for the user's organizations
    const { data: venues } = await supabase.from("venues").select("id").in("organization_id", orgIds);
    const venueIds = (venues ?? []).map((v: any) => v.id);

    if (venueIds.length === 0) {
      return NextResponse.json({ success: true, data: { packages: [], counts: {} } });
    }

    const activeVenueIds = venueId && venueIds.includes(venueId) ? [venueId] : venueIds;

    let query = supabase
      .from("venue_packages")
      .select("id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active, venue_id, created_at")
      .in("venue_id", activeVenueIds)
      .order("created_at", { ascending: false });

    if (q) query = query.ilike("name", `%${q}%`);

    const { data: packages } = await query;

    // Build simple counts per venue from the returned rows (cheap for owner-sized sets)
    const counts: Record<string, number> = {};
    (packages ?? []).forEach((p: any) => {
      counts[p.venue_id] = (counts[p.venue_id] || 0) + 1;
    });

    return NextResponse.json({ success: true, data: { packages: packages ?? [], counts } });
  } catch (err: any) {
    console.error("[GET /api/packages]", err);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: err.message || "Server error" } }, { status: 500 });
  }
}
