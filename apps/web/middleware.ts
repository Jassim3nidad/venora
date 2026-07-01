import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PROTECTED_ROUTES } from "@/lib/rbac/roles";

/**
 * Middleware — three responsibilities:
 *  1. Session refresh:  keeps the Supabase session cookie alive on every request.
 *  2. Auth guard:       redirects unauthenticated users away from protected routes.
 *  3. Role guard:       redirects authenticated users who lack the required role.
 *
 * Route-to-role mapping lives exclusively in src/lib/rbac/roles.ts → PROTECTED_ROUTES.
 * Do NOT add new protected paths here — add them there.
 */

// Auth-only paths — logged-in users are bounced back to "/" from these.
const AUTH_ONLY_PATHS = ["/login", "/register", "/forgot-password", "/verify-email"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not add logic between createServerClient and getUser().
  // getUser() also refreshes the session cookie via the setAll hook above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── 1. Route guard ────────────────────────────────────────────────────────
  // Find the most-specific protected route that the current pathname matches.
  // PROTECTED_ROUTES is ordered most-specific-first, so Array.find() is safe.
  const matchedRoute = PROTECTED_ROUTES.find(({ prefix }) =>
    pathname.startsWith(prefix)
  );

  if (matchedRoute) {
    // 1a. Not authenticated → /login
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 1b. Authenticated but wrong role → /unauthorized
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (roleRows ?? []).map((r) => r.role as string);
    const hasAccess = matchedRoute.allow.some((role) => userRoles.includes(role));

    if (!hasAccess) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // ── 2. Bounce logged-in users away from auth-only pages ──────────────────
  if (user && AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except static files and Next.js internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
