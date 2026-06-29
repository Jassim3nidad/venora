import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware — two responsibilities:
 *  1. Session refresh: keeps the Supabase session cookie alive on every request.
 *  2. Role guard: redirects unauthenticated or unauthorised users.
 */

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/bookings",
  "/favorites",
  "/account",
  "/dashboard",
  "/admin",
];

// Routes that require specific roles
const ROLE_GUARDS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/venues",    roles: ["venue_owner", "admin"] },
  { prefix: "/dashboard/calendar",  roles: ["venue_owner", "admin"] },
  { prefix: "/dashboard/packages",  roles: ["venue_owner", "admin"] },
  { prefix: "/dashboard/staff",     roles: ["venue_owner", "admin"] },
  { prefix: "/dashboard/analytics", roles: ["venue_owner", "supplier", "admin"] },
  { prefix: "/admin",               roles: ["admin"] },
];

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

  // IMPORTANT: Do not add logic between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Auth guard — redirect unauthenticated users
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Role guard — redirect users without the required role
  if (user) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (roles ?? []).map((r) => r.role);

    for (const guard of ROLE_GUARDS) {
      if (pathname.startsWith(guard.prefix)) {
        const hasAccess = guard.roles.some((role) => userRoles.includes(role));
        if (!hasAccess) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/";
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  // 3. Redirect logged-in users away from auth pages
  const AUTH_PATHS = ["/login", "/register", "/forgot-password"];
  if (user && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
