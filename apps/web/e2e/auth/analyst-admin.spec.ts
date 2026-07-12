import { test, expect } from "@playwright/test";
import { loginAs, VIEWPORTS } from "../helpers/auth";

// Authenticated E2E for the analyst admin_tier, using the dedicated QA
// fixture analyst-admin@venora.local (see apps/web/.env.local, gitignored).
//
// Expectations are derived from the LIVE admin_role_permissions table,
// queried directly before writing this file, not from generic assumptions:
// analyst holds exactly 5 permissions --
//   admin.dashboard.view, audit_logs.view, reports.view, reports.generate,
//   reports.export
// -- and nothing else. Notably it does NOT include marketplace.view,
// commissions.*, users.*, venues.*, suppliers.*, ai_config.*,
// system_settings.*, or admin_roles.manage/admin_accounts.*.

test.describe("Analyst administrator — allowed", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "analystAdmin");
  });

  test("logs in successfully", async ({ page }) => {
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))).toBe(true);
  });

  test("can view the administrator dashboard", async ({ page }) => {
    await page.goto("/admin");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("can view reports", async ({ page }) => {
    await page.goto("/admin/reports");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("can view audit logs", async ({ page }) => {
    await page.goto("/admin/audit-logs");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("navigation shows only permitted modules (Overview, Reports, Audit Logs)", async ({ page }) => {
    await page.goto("/admin");
    const nav = page.locator("nav, aside").first();
    const navText = (await nav.textContent()) ?? "";
    expect(navText).toMatch(/Reports/);
    expect(navText).toMatch(/Audit Logs/);
    // Forbidden modules must not appear in the nav at all.
    expect(navText).not.toMatch(/Commissions/);
    expect(navText).not.toMatch(/Administrators/);
    expect(navText).not.toMatch(/AI Configuration/);
    expect(navText).not.toMatch(/Marketplace/);
    expect(navText).not.toMatch(/Settings/);
  });
});

test.describe("Analyst administrator — forbidden mutations and modules", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "analystAdmin");
  });

  const forbiddenReadRoutes = [
    "/admin/users",
    "/admin/venues",
    "/admin/suppliers",
    "/admin/commissions",
    "/admin/marketplace",
    "/admin/ai-configuration",
    "/admin/settings",
    "/admin/administrators",
  ];
  for (const route of forbiddenReadRoutes) {
    test(`cannot access ${route} (no permission for that module at all)`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveTitle(/Unauthorized/i);
    });
  }

  const forbiddenMutations: Array<[string, string, Record<string, unknown>]> = [
    ["suspend a user", "/api/admin/users/suspend", { userId: "00000000-0000-0000-0000-000000000003" }],
    ["reactivate a user", "/api/admin/users/reactivate", { userId: "00000000-0000-0000-0000-000000000003" }],
    ["approve a venue", "/api/admin/venues/approve", { venueId: "d131d99a-5300-4de4-a23f-03abf6c61c1d" }],
    ["reject a venue", "/api/admin/venues/reject", { venueId: "d131d99a-5300-4de4-a23f-03abf6c61c1d" }],
    ["suspend a venue", "/api/admin/venues/suspend", { venueId: "d131d99a-5300-4de4-a23f-03abf6c61c1d" }],
    ["approve a supplier", "/api/admin/suppliers/approve", { supplierId: "00000000-0000-0000-0000-000000000000" }],
    ["reject a supplier", "/api/admin/suppliers/reject", { supplierId: "00000000-0000-0000-0000-000000000000" }],
    ["suspend a supplier", "/api/admin/suppliers/suspend", { supplierId: "00000000-0000-0000-0000-000000000000" }],
    ["create a commission rule", "/api/admin/commissions", { scope: "global", percentage: 5 }],
    ["edit a commission rule", "/api/admin/commissions/update", { id: "00000000-0000-0000-0000-000000000000" }],
    ["override a commission", "/api/admin/commissions/override", { transactionId: "00000000-0000-0000-0000-000000000000" }],
    ["change system settings", "/api/admin/settings", { key: "test", value: "x" }],
    ["change AI configuration", "/api/admin/ai-configuration", { feature: "search", enabled: false }],
    ["assign administrator tiers", "/api/admin/administrators/assign-tier", { targetUserId: "00000000-0000-0000-0000-000000000002", newTier: "analyst" }],
  ];
  for (const [label, route, body] of forbiddenMutations) {
    test(`cannot ${label} (direct API call)`, async ({ page }) => {
      const res = await page.request.post(route, { data: body, failOnStatusCode: false });
      expect([401, 403, 404, 405]).toContain(res.status());
    });
  }

  test("cannot escalate its own tier or assign itself another role", async ({ page }) => {
    const res = await page.request.post("/api/admin/administrators/assign-tier", {
      data: { targetUserId: "495ead5d-2ad1-424d-bbbc-b8469f9e5c57", newTier: "super_admin" },
      failOnStatusCode: false,
    });
    expect(res.status()).not.toBe(200);
  });

  test("cannot retrieve full AI provider keys through any endpoint", async ({ page }) => {
    const res = await page.request.get("/api/admin/ai-configuration/secrets", { failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(res.status());
  });

  test("cannot mutate append-only audit logs", async ({ page }) => {
    const putRes = await page.request.put("/api/admin/audit-logs/1", { data: {}, failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(putRes.status());
    const delRes = await page.request.delete("/api/admin/audit-logs/1", { failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(delRes.status());
  });
});

test.describe("Analyst administrator — responsive", () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`loads /admin cleanly at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginAs(page, "analystAdmin");
      await page.goto("/admin");
      expect(page.url()).not.toContain("/unauthorized");
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(hasOverflow).toBe(false);
    });
  }
});
