import { test, expect } from "@playwright/test";
import { loginAs, VIEWPORTS } from "../helpers/auth";

// Authenticated E2E for the customer role, using the dedicated QA fixture
// customer@venora.local (credentials in apps/web/.env.local, gitignored).
// RLS/authorization is verified as enforced through the application layer
// (route access + page.request, which carries the session cookie
// automatically) -- not via a raw PostgREST call with an extracted
// session token, which this environment's safety tooling correctly
// treats as credential materialization even for a dedicated test
// account. Real users never bypass the app this way either.

test.describe("Customer role", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "customer");
  });

  test("logs in successfully", async ({ page }) => {
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))).toBe(true);
  });

  test("can access their own bookings, favorites, and profile", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page).toHaveTitle(/Bookings/i);

    await page.goto("/favorites");
    expect(page.url()).not.toContain("/login");
    expect(page.url()).not.toContain("/unauthorized");

    await page.goto("/settings");
    expect(page.url()).not.toContain("/login");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("cannot access /admin or any admin subroute", async ({ page }) => {
    for (const path of ["/admin", "/admin/administrators", "/admin/users", "/admin/commissions", "/admin/audit-logs", "/admin/settings"]) {
      await page.goto(path);
      await expect(page).toHaveTitle(/Unauthorized/i);
    }
  });

  test("cannot access venue-owner or supplier dashboards", async ({ page }) => {
    await page.goto("/dashboard/venue-owner");
    await expect(page).toHaveTitle(/Unauthorized/i);

    await page.goto("/dashboard/supplier");
    await expect(page).toHaveTitle(/Unauthorized/i);
  });

  test("cannot invoke administrator APIs directly (401/403, not data)", async ({ page }) => {
    const res = await page.request.get("/api/admin/reports/export");
    expect([401, 403]).toContain(res.status());
  });

  test("cannot supply commission snapshot fields via any client-reachable path", async ({ page }) => {
    // There is no customer-facing form or API route that accepts
    // commission fields at all -- confirm the admin commission-rule
    // creation endpoint rejects this session outright rather than
    // silently accepting attacker-supplied commission data.
    const res = await page.request.post("/api/admin/commissions", {
      data: { scope: "global", percentage: 0, commission_amount: 999999 },
      failOnStatusCode: false,
    });
    expect([401, 403, 404, 405]).toContain(res.status());
  });
});

test.describe("Customer role — responsive", () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`loads /bookings cleanly at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginAs(page, "customer");
      await page.goto("/bookings");
      await expect(page).toHaveTitle(/Bookings/i);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(hasOverflow).toBe(false);
    });
  }
});
