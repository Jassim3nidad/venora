import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type RoleName } from "@/lib/rbac/roles";
import { isSafeInternalRedirect, resolvePostAuthRedirect } from "@/lib/profile-setup";

const PASSWORD_RECOVERY_COOKIE = "venora-password-recovery";

// Account-restriction errors get their own message; everything else about
// a failed exchange collapses into the generic oauth_callback_failed code so
// we never leak provider/Supabase error internals to the client.
function isRestrictedAccountError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("banned") || normalized.includes("suspended");
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");
  const providerError = requestUrl.searchParams.get("error");

  // ── Token-based verification (email confirmation links) ────────────
  // Redirect token_hash to the /confirm route to prevent email scanners
  // from consuming the single-use token during pre-fetch.
  if (tokenHash && type) {
    const confirmUrl = new URL("/confirm", request.url);
    confirmUrl.searchParams.set("token_hash", tokenHash);
    confirmUrl.searchParams.set("type", type);
    if (isSafeInternalRedirect(next)) confirmUrl.searchParams.set("next", next!);

    return NextResponse.redirect(confirmUrl);
  }

  // ── Provider-side failure (user cancelled Google, provider/config error) ──
  // Google/Supabase report these via `error` on the redirect instead of a
  // code — never forward the raw provider `error_description` to the client.
  if (!code && providerError) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "error",
      providerError === "access_denied" ? "oauth_cancelled" : "oauth_provider_error",
    );

    return NextResponse.redirect(redirectUrl);
  }

  // ── PKCE / OAuth code exchange ─────────────────────────────────────
  if (!code) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "oauth_callback_failed");

    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "error",
      isRestrictedAccountError(error.message) ? "account_restricted" : "oauth_callback_failed",
    );

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

      const target =
        next === "/reset-password"
          ? "/reset-password"
          : resolvePostAuthRedirect({
              roles,
              profile,
              redirectTo: next,
            });

      const response = NextResponse.redirect(new URL(target, request.url));
      if (target === "/reset-password") {
        response.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", {
          httpOnly: true,
          sameSite: "lax",
          secure: requestUrl.protocol === "https:",
          maxAge: 10 * 60,
          path: "/",
        });
      }
      return response;
    }

    return NextResponse.redirect(new URL("/login", request.url));
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
