/**
 * Shared helper for pages that render <CustomerNavbar /> outside of a
 * layout (booking flow pages, etc). Without passing `profile`, the navbar
 * has no way to know the user is signed in and silently falls back to the
 * logged-out "Log In" button, even though `user` already exists server-side.
 */
export async function getNavbarProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string | undefined | null,
): Promise<{
  full_name: string | null;
  avatar_url: string | null;
  isVenueOwner?: boolean;
  isSupplier?: boolean;
} | null> {
  if (!userId) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const isVenueOwner =
    roles?.some((r: any) => r.role === "venue_owner") ?? false;
  const isSupplier =
    roles?.some((r: any) => r.role === "supplier") ?? false;

  return { ...(profile ?? {}), isVenueOwner, isSupplier } as any;
}
