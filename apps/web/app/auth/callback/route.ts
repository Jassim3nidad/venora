import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type RoleName } from "@/lib/rbac/roles";
import { resolvePostAuthRedirect } from "@/lib/profile-setup";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");

  // ── Token-based verification (email confirmation links) ────────────
  // Redirect token_hash to the /confirm route to prevent email scanners
  // from consuming the single-use token during pre-fetch.
  if (tokenHash && type) {
    const confirmUrl = new URL("/confirm", request.url);
    confirmUrl.searchParams.set("token_hash", tokenHash);
    confirmUrl.searchParams.set("type", type);
    if (next) confirmUrl.searchParams.set("next", next);
    
    return NextResponse.redirect(confirmUrl);
  }

  // ── PKCE / OAuth code exchange ─────────────────────────────────────
  if (!code) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "missing_auth_code");

    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "auth_callback_failed");

    return NextResponse.redirect(redirectUrl);
  }

  if (next) {
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();

    if (nextUser) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", nextUser.id)
        .limit(1);

      const roles = ((roleRows ?? []) as { role: RoleName }[])
        .map((row) => row.role)
        .filter(Boolean);

      const { data: profile } = (await supabase
        .from("profiles")
        .select("profile_setup_completed_at")
        .eq("id", nextUser.id)
        .single()) as {
        data: { profile_setup_completed_at: string | null } | null;
      };

      const target = resolvePostAuthRedirect({
        roles,
        profile,
        redirectTo: next,
      });

      return NextResponse.redirect(new URL(target, request.url));
    }

    return NextResponse.redirect(new URL(next, request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);

  const roles = ((roleRows ?? []) as { role: RoleName }[])
    .map((row) => row.role)
    .filter(Boolean);

  const { data: profile } = (await supabase
    .from("profiles")
    .select("profile_setup_completed_at")
    .eq("id", user.id)
    .single()) as {
    data: { profile_setup_completed_at: string | null } | null;
  };

  return NextResponse.redirect(
    new URL(resolvePostAuthRedirect({ roles, profile }), request.url),
  );
}
