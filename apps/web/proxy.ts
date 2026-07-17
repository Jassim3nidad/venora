import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@venora/database";
import {
  isProfileSetupExemptPath,
  needsProfileSetup,
  resolvePostAuthRedirect,
} from "@/lib/profile-setup";
import {
  PROTECTED_ROUTES,
  defaultRouteForRoles,
  type RoleName,
} from "@/lib/rbac/roles";

/**
 * Proxy — two responsibilities:
 * 1. Session refresh: keeps the Supabase session cookie alive on every request.
 * 2. Role guard: redirects unauthenticated or unauthorized users.
 */

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function assertPublicSupabaseKey(key: string): string {
  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY holds a secret key (sb_secret_...). " +
        "Proxy must use a public anon or publishable key so RLS remains enforced.",
    );
  }

  return key;
}

// Routes that require authentication.
// Important: /venues is intentionally NOT protected.
// Public:
// - /venues
// - /venues/[slug]
//
// Protected separately:
// - /venues/[slug]/book
const PROTECTED_PREFIXES = [
  "/bookings",
  "/favorites",
  "/account",
  "/settings",
  "/dashboard",
  "/admin",
];

// Routes that require specific roles. Sourced from rbac/roles.ts's
// PROTECTED_ROUTES — the single source of truth (also used by the
// server-side requireRole()/requireAdmin() guards) — so this list can
// never silently drift from what Server Components/Actions enforce.
const ROLE_GUARDS = PROTECTED_ROUTES;

const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

function redirectWithCookies(url: URL | string, sourceResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    assertPublicSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
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

  let userRoles: RoleName[] = [];
  if (user) {
    // Edge Runtime bug: @supabase/ssr sometimes drops cookies when calling .from()
    // By extracting the session token and setting it explicitly in the headers,
    // we bypass the bug without needing the service role key.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authSupabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      },
    );

    const { data: roleRows } = await authSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    userRoles = ((roleRows ?? []) as { role: RoleName }[])
      .map((r) => r.role)
      .filter(Boolean);
  }

  const { pathname, searchParams, search } = request.nextUrl;

  // Intercept Supabase Auth PKCE code on the root
  if (pathname === "/" && searchParams.has("code")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/callback";
    return redirectWithCookies(redirectUrl, supabaseResponse);
  }

  // Intercept Supabase Auth errors on the root (e.g., expired OTPs)
  if (pathname === "/" && searchParams.get("error") === "access_denied") {
    const errorDesc =
      searchParams.get("error_description") ||
      "Your link is invalid or has expired.";
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", errorDesc);
    return redirectWithCookies(redirectUrl, supabaseResponse);
  }

  const isVenueBookingPath = /^\/venues\/[^/]+\/book(?:\/)?$/.test(pathname);

  const isProtected =
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    isVenueBookingPath;

  // 1. Auth guard — redirect unauthenticated users
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);

    if (pathname.startsWith("/bookings")) {
      redirectUrl.searchParams.set("prompt", "bookings");
    } else if (pathname.startsWith("/favorites")) {
      redirectUrl.searchParams.set("prompt", "favorites");
    }

    return redirectWithCookies(redirectUrl, supabaseResponse);
  }

  // 2. Redirect logged-in users away from auth pages
  if (user && AUTH_PATHS.some((path) => pathname.startsWith(path))) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("profile_setup_completed_at")
      .eq("id", user.id)
      .single()) as {
      data: { profile_setup_completed_at: string | null } | null;
    };

    return redirectWithCookies(
      new URL(
        resolvePostAuthRedirect({
          roles: userRoles,
          profile,
          redirectTo:
            searchParams.get("redirectTo") ?? searchParams.get("next"),
        }),
        request.url,
      ),
      supabaseResponse,
    );
  }

  // 3. Bare /dashboard — send each role to its own dashboard home.
  // Only venue owners (and admins) may stay on /dashboard; everyone else
  // gets routed via defaultRouteForRoles so coordinators never land in the
  // venue-owner shell.
  if (user && pathname === "/dashboard") {
    const target = defaultRouteForRoles(userRoles);

    return redirectWithCookies(new URL(target, request.url), supabaseResponse);
  }

  // 4. Role guard — redirect users without the required role
  if (user) {
    const matchedGuard = ROLE_GUARDS.find((guard) =>
      pathname.startsWith(guard.prefix) && guard.prefix !== "/bookings",
    );

    if (matchedGuard) {
      const hasAccess = matchedGuard.allow.some((role) =>
        userRoles.includes(role),
      );

      if (!hasAccess) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/unauthorized";
        return redirectWithCookies(redirectUrl, supabaseResponse);
      }
    }
  }

  // 5. Profile setup gate — prompt new customers before using the app
  if (user && !isProfileSetupExemptPath(pathname)) {
    if (userRoles.includes("customer")) {
      const { data: profile } = (await supabase
        .from("profiles")
        .select("profile_setup_completed_at")
        .eq("id", user.id)
        .single()) as {
        data: { profile_setup_completed_at: string | null } | null;
      };

      if (needsProfileSetup(userRoles, profile)) {
        return redirectWithCookies(
          new URL("/profile/setup", request.url),
          supabaseResponse,
        );
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
