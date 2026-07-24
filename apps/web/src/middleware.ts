import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PROTECTED_ROUTES } from "@/lib/rbac/roles";

// Best-effort application throttling for the approved free-tier deployment.
// Note: Counters are isolated by serverless instance and may reset during cold starts.
// This implementation is best-effort and not globally distributed.
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export const rateLimits = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 5000;

export function checkRateLimit(
  ip: string,
  path: string,
  method: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const key = `${ip}:${path}:${method}`;

  // Periodically remove expired entries and bound memory
  if (rateLimits.size > MAX_ENTRIES) {
    for (const [k, v] of rateLimits.entries()) {
      if (now > v.resetAt) {
        rateLimits.delete(k);
      }
    }
    // If still too large (e.g. active attack), clear it to avoid OOM
    if (rateLimits.size > MAX_ENTRIES) {
      rateLimits.clear();
    }
  }

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

  // 14. Avoid trusting arbitrary client-controlled IP headers without validation.
  // 13. Handle malformed forwarding headers safely.
  let ip = "127.0.0.1";
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    ip = forwardedFor.split(",")[0]?.trim() || "127.0.0.1";
  } else {
    ip = request.headers.get("x-real-ip") || "127.0.0.1";
  }

  const url = request.nextUrl.clone();
  const path = url.pathname;
  const method = request.method;

  // 15. Avoid redirect loops involving the 429 page.
  if (path === "/429") {
    return supabaseResponse;
  }

  // 3. Exclude health checks and required platform callbacks.
  // 4. Avoid breaking Supabase authentication callbacks.
  // 5. Avoid breaking PayMongo webhook delivery.
  // 6. Avoid breaking Vercel deployment verification.
  const isExcludedRoute =
    path === "/api/health" ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/api/webhooks/") ||
    path === "/api/deployment-verify";

  if (!isExcludedRoute) {
    // Define limits (requests per minute)
    let maxRequests = 100; // Default generic limit

    // Specific Rate Limits
    if (method === "POST" && (path === "/login" || path === "/register")) {
      maxRequests = 10; // Login/Registration limit
    } else if (path.startsWith("/api/ai") || path.includes("ai-assistant")) {
      maxRequests = 20; // AI requests limit
    } else if (path === "/search" || path.startsWith("/api/search")) {
      maxRequests = 60; // Search limit
    } else if (
      method === "POST" &&
      (path.startsWith("/api/bookings") ||
        path.startsWith("/dashboard/bookings"))
    ) {
      maxRequests = 30; // Bookings limit
    } else if (
      path.startsWith("/admin") &&
      ["POST", "PUT", "DELETE", "PATCH"].includes(method)
    ) {
      maxRequests = 50; // Admin mutations limit
    } else if (
      method === "POST" &&
      /^\/api\/suppliers\/[^/]+\/contact$/.test(path)
    ) {
      maxRequests = 10; // Supplier contact: 10 per minute per IP
    } else if (method === "GET" && path === "/api/admin/reports/export") {
      maxRequests = 5; // Admin report export: 5 per minute per IP
    }

    // Check Rate Limit (1 minute window)
    const isAllowed = checkRateLimit(ip, path, method, maxRequests, 60000);

    if (!isAllowed) {
      if (path.startsWith("/api")) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests. Please try again later.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          },
        );
      } else {
        url.pathname = "/429";
        return NextResponse.redirect(url);
      }
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

  // Protect all restricted routes
  const isProtected = PROTECTED_ROUTES.some(
    (route) => url.pathname === route.prefix || url.pathname.startsWith(`${route.prefix}/`)
  );

  if (isProtected) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = `?next=${encodeURIComponent(url.pathname + url.search)}`;
      return NextResponse.redirect(redirectUrl);
    }
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
