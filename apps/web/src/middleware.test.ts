import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware, checkRateLimit, rateLimits } from "./middleware";

// Mock @supabase/ssr because middleware relies on it, and we don't want real connections
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

// Mock process.env for Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-key";

describe("Middleware Rate Limiter", () => {
  beforeEach(() => {
    rateLimits.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function createMockRequest(
    path: string,
    method: string,
    ip: string | null = null,
    headers: Record<string, string> = {}
  ): NextRequest {
    const req = new NextRequest(`http://localhost:3000${path}`, {
      method,
    });
    // Manually define IP since request.ip is read-only or depends on the environment
    Object.defineProperty(req, "ip", { value: ip });

    for (const [key, value] of Object.entries(headers)) {
      req.headers.set(key, value);
    }
    return req;
  }

  it("1. Requests below the limit pass", async () => {
    const req = createMockRequest("/api/test", "GET", "1.2.3.4");
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it("2. Requests above the limit return 429", async () => {
    const req = createMockRequest("/api/ai", "POST", "1.2.3.4");
    // Limit is 20 for /api/ai
    for (let i = 0; i < 20; i++) {
      const res = await middleware(req);
      expect(res.status).toBe(200);
    }
    // 21st request should fail
    const res = await middleware(req);
    expect(res.status).toBe(429);
    
    // 3. Retry-After is included
    expect(res.headers.get("Retry-After")).toBe("60");
    
    // 7. API routes receive JSON
    const json = await res.json();
    expect(json).toEqual({ error: "Too many requests. Please try again later." });
  });

  it("4. Entries expire and 5. Expired entries are removed (implicitly by resetAt logic)", async () => {
    const req = createMockRequest("/api/ai", "POST", "2.2.2.2");
    // Max out limit
    for (let i = 0; i < 20; i++) {
      await middleware(req);
    }
    expect((await middleware(req)).status).toBe(429);

    // Advance time by 61 seconds
    vi.advanceTimersByTime(61000);

    // Should be allowed again
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it("6. Memory storage is bounded", () => {
    // MAX_ENTRIES is 5000
    // We can test `checkRateLimit` directly to simulate 5001 entries
    for (let i = 0; i < 5001; i++) {
      checkRateLimit(`ip-${i}`, "/api/test", "GET", 100, 60000);
    }
    // Storage shouldn't exceed 5001 (actually, if they haven't expired, it hits 5001 then clears if still large or just cleans up expired ones)
    // When size > 5000, it clears expired. None are expired here, so it clears everything!
    checkRateLimit("ip-5002", "/api/test", "GET", 100, 60000);
    // After clearing, only the last one should be present
    expect(rateLimits.size).toBeLessThan(5000);
  });

  it("8. Browser routes use the existing 429 interface", async () => {
    const req = createMockRequest("/some-page", "GET", "3.3.3.3");
    // Default limit is 100
    for (let i = 0; i < 100; i++) {
      await middleware(req);
    }
    const res = await middleware(req);
    // Should redirect to /429
    expect(res.status).toBe(307); // Next.js redirects default to 307
    expect(res.headers.get("location")).toContain("/429");
  });

  it("11. Authentication callbacks are not blocked", async () => {
    const req = createMockRequest("/auth/callback", "GET", "4.4.4.4");
    // Even if we send 200 requests, it shouldn't block
    for (let i = 0; i < 150; i++) {
      const res = await middleware(req);
      expect(res.status).toBe(200);
    }
  });

  it("12. PayMongo webhooks are not incorrectly blocked", async () => {
    const req = createMockRequest("/api/webhooks/paymongo", "POST", "5.5.5.5");
    for (let i = 0; i < 150; i++) {
      const res = await middleware(req);
      expect(res.status).toBe(200);
    }
  });

  it("13. The 429 page cannot redirect into itself", async () => {
    const req = createMockRequest("/429", "GET", "6.6.6.6");
    for (let i = 0; i < 150; i++) {
      const res = await middleware(req);
      // Even past limit, it returns 200 (NextResponse.next()) because it bypasses rate limits
      expect(res.status).toBe(200);
    }
  });

  it("14. Separate route groups can use separate limits", async () => {
    const aiReq = createMockRequest("/api/ai", "POST", "7.7.7.7"); // limit 20
    const searchReq = createMockRequest("/api/search", "GET", "7.7.7.7"); // limit 60

    for (let i = 0; i < 20; i++) {
      await middleware(aiReq);
    }
    expect((await middleware(aiReq)).status).toBe(429);

    // But search is still allowed
    expect((await middleware(searchReq)).status).toBe(200);
  });

  it("15. Invalid forwarding headers do not crash middleware", async () => {
    // Malformed IP
    const req = createMockRequest("/api/test", "GET", null, {
      "x-forwarded-for": "10.0.0.1, invalid-ip, , 192.168.1.1",
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);

    // We can inspect the key in rateLimits to see it extracted 10.0.0.1
    expect(rateLimits.has("10.0.0.1:/api/test:GET")).toBe(true);
  });
});
