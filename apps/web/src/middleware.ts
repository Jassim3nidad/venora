import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Simple in-memory rate limiter for Edge Runtime
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();

function checkRateLimit(
  ip: string,
  path: string,
  method: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const key = `${ip}:${path}:${method}`;

  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true; // Allowed
  }

  if (entry.count >= maxRequests) {
    return false; // Rate limited
  }

  entry.count++;
  return true; // Allowed
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Basic IP extraction for Rate Limiting
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const url = request.nextUrl.clone();
  const path = url.pathname;
  const method = request.method;

  // Define limits (requests per minute)
  let maxRequests = 100; // Default generic limit

  // Specific Rate Limits
  if (
    method === "POST" &&
    (path === "/login" ||
      path === "/register" ||
      path.startsWith("/auth/callback"))
  ) {
    maxRequests = 10; // Login/Registration limit
  } else if (path.startsWith("/api/ai") || path.includes("ai-assistant")) {
    maxRequests = 20; // AI requests limit
  } else if (path === "/search" || path.startsWith("/api/search")) {
    maxRequests = 60; // Search limit
  } else if (
    method === "POST" &&
    (path.startsWith("/api/bookings") || path.startsWith("/dashboard/bookings"))
  ) {
    maxRequests = 30; // Bookings limit
  } else if (
    path.startsWith("/admin") &&
    ["POST", "PUT", "DELETE", "PATCH"].includes(method)
  ) {
    maxRequests = 50; // Admin mutations limit
  }

  // Check Rate Limit (1 minute window)
  const isAllowed = checkRateLimit(ip, path, method, maxRequests, 60000);

  if (!isAllowed) {
    if (path.startsWith("/api")) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        },
      );
    } else {
      url.pathname = "/429";
      return NextResponse.redirect(url);
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /admin routes
  if (url.pathname.startsWith("/admin")) {
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Server-side granular role checks are handled via requireAdmin() in the Server Components,
    // so we just need to ensure the user is logged in here before they hit the admin bundle.
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
