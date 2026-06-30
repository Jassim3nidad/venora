import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@venora/database";

/**
 * Middleware — two responsibilities:
 * 1. Session refresh: keeps the Supabase session cookie alive on every request.
 * 2. Role guard: redirects unauthenticated or unauthorized users.
 */

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

type UserRole =
  | "customer"
  | "venue_owner"
  | "event_coordinator"
  | "supplier"
  | "admin";

type RoleJoinRow = {
  roles:
    | {
        name: UserRole;
      }
    | {
        name: UserRole;
      }[]
    | null;
};

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/bookings",
  "/favorites",
  "/account",
  "/dashboard",
  "/admin",
];

// Routes that require specific roles
const ROLE_GUARDS: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/dashboard/venues", roles: ["venue_owner", "admin"] },
  { prefix: "/dashboard/calendar", roles: ["venue_owner", "admin"] },
  { prefix: "/dashboard/packages", roles: ["venue_owner", "admin"] },
  { prefix: "/dashboard/staff", roles: ["venue_owner", "admin"] },
  { prefix: "/dashboard/analytics", roles: ["venue_owner", "supplier", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
];

const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

function extractRoleName(row: RoleJoinRow): UserRole | null {
  const roles = row.roles;

  if (!roles) return null;

  if (Array.isArray(roles)) {
    return roles[0]?.name ?? null;
  }

  return roles.name;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    },
  );

  // Important: keep auth.getUser() immediately after creating the client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  // 1. Auth guard — redirect unauthenticated users
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);

    return NextResponse.redirect(redirectUrl);
  }

  // 2. Redirect logged-in users away from auth pages
  if (user && AUTH_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. Role guard — redirect users without the required role
  if (user) {
    const matchedGuard = ROLE_GUARDS.find((guard) =>
      pathname.startsWith(guard.prefix),
    );

    if (matchedGuard) {
      const { data: roleRows, error } = await (
        supabase.from("user_roles") as any
      )
        .select("roles(name)")
        .eq("user_id", user.id);

      if (error) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/unauthorized";

        return NextResponse.redirect(redirectUrl);
      }

      const userRoles = ((roleRows ?? []) as RoleJoinRow[])
        .map(extractRoleName)
        .filter((role): role is UserRole => role !== null);

      const hasAccess = matchedGuard.roles.some((role) =>
        userRoles.includes(role),
      );

      if (!hasAccess) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/unauthorized";

        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};