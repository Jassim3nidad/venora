import { type NextRequest, NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitPolicy = {
  maxRequests: number;
  windowMs: number;
};

export const rateLimits = new Map<string, RateLimitEntry>();

const MAX_ENTRIES = 5000;
const ONE_MINUTE_MS = 60_000;
const DEFAULT_POLICY: RateLimitPolicy = {
  maxRequests: 100,
  windowMs: ONE_MINUTE_MS,
};

function isValidIpv4(value: string): boolean {
  const segments = value.split(".");

  return (
    segments.length === 4 &&
    segments.every((segment) => {
      if (!/^\d{1,3}$/.test(segment)) {
        return false;
      }

      const number = Number(segment);
      return number >= 0 && number <= 255;
    })
  );
}

function isValidIpv6(value: string): boolean {
  if (
    value.length < 2 ||
    value.length > 45 ||
    !value.includes(":") ||
    !/^[0-9a-f:]+$/i.test(value)
  ) {
    return false;
  }

  const compressionMarkers = value.match(/::/g)?.length ?? 0;
  if (compressionMarkers > 1) {
    return false;
  }

  const segments = value.split(":");
  if (
    (compressionMarkers === 0 && segments.length !== 8) ||
    (compressionMarkers === 1 && segments.length > 8)
  ) {
    return false;
  }

  return segments.every(
    (segment) => segment === "" || /^[0-9a-f]{1,4}$/i.test(segment),
  );
}

function normalizeIp(value: string | null): string | null {
  const candidate = value?.trim();
  if (!candidate) {
    return null;
  }

  const unwrapped =
    candidate.startsWith("[") && candidate.endsWith("]")
      ? candidate.slice(1, -1)
      : candidate;

  return isValidIpv4(unwrapped) || isValidIpv6(unwrapped)
    ? unwrapped.toLowerCase()
    : null;
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = normalizeIp(forwardedFor?.split(",")[0] ?? null);
  const realIp = normalizeIp(request.headers.get("x-real-ip"));

  return forwardedIp ?? realIp ?? "unknown";
}

export function checkRateLimit(
  ip: string,
  path: string,
  method: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const key = `${ip}:${path}:${method}`;

  if (rateLimits.size > MAX_ENTRIES) {
    for (const [entryKey, entry] of rateLimits.entries()) {
      if (now > entry.resetAt) {
        rateLimits.delete(entryKey);
      }
    }

    if (rateLimits.size > MAX_ENTRIES) {
      rateLimits.clear();
    }
  }

  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  return true;
}

function isExcludedPath(path: string): boolean {
  return (
    path === "/429" ||
    path === "/api/health" ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/api/webhooks/") ||
    path === "/api/deployment-verify"
  );
}

function getPolicy(path: string, method: string): RateLimitPolicy {
  if (method === "POST" && (path === "/login" || path === "/register")) {
    return { maxRequests: 10, windowMs: ONE_MINUTE_MS };
  }

  if (
    path.startsWith("/api/ai") ||
    path.includes("ai-assistant") ||
    path === "/account/event-planner"
  ) {
    return { maxRequests: 20, windowMs: ONE_MINUTE_MS };
  }

  if (path === "/search" || path.startsWith("/api/search")) {
    return { maxRequests: 60, windowMs: ONE_MINUTE_MS };
  }

  if (
    method === "POST" &&
    (path.startsWith("/api/bookings") || path.startsWith("/dashboard/bookings"))
  ) {
    return { maxRequests: 30, windowMs: ONE_MINUTE_MS };
  }

  if (
    path.startsWith("/admin") &&
    ["POST", "PUT", "DELETE", "PATCH"].includes(method)
  ) {
    return { maxRequests: 50, windowMs: ONE_MINUTE_MS };
  }

  if (method === "POST" && /^\/api\/suppliers\/[^/]+\/contact$/.test(path)) {
    return { maxRequests: 10, windowMs: ONE_MINUTE_MS };
  }

  if (method === "GET" && path === "/api/admin/reports/export") {
    return { maxRequests: 5, windowMs: ONE_MINUTE_MS };
  }

  return DEFAULT_POLICY;
}

export function applyRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (isExcludedPath(pathname)) {
    return null;
  }

  const policy = getPolicy(pathname, request.method);
  const isAllowed = checkRateLimit(
    getClientIp(request),
    pathname,
    request.method,
    policy.maxRequests,
    policy.windowMs,
  );

  if (isAllowed) {
    return null;
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      },
    );
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/429";
  return NextResponse.redirect(redirectUrl);
}
