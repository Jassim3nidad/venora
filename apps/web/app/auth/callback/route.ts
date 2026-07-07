import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultRouteForRoles, type RoleName } from "@/lib/rbac/roles";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");

  // ── Token-based verification (email confirmation links) ────────────
  // Supabase email verification sends ?token_hash=...&type=signup
  // rather than a PKCE ?code=... parameter.
  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email",
    });

    if (error) {
      console.error("[auth/callback] verifyOtp failed:", error.message);
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "verification_failed");
      return NextResponse.redirect(redirectUrl);
    }

    // Email confirmed — send to login with success indicator
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("verified", "true");
    return NextResponse.redirect(redirectUrl);
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

  return NextResponse.redirect(new URL(defaultRouteForRoles(roles), request.url));
}
