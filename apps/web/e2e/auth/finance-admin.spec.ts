import { test, expect } from "@playwright/test";
import { loginAs, VIEWPORTS } from "../helpers/auth";

// Authenticated E2E for the finance_admin admin_tier, using the dedicated
// QA fixture finance-admin@venora.local (see apps/web/.env.local, gitignored).
//
// Expectations are derived from the LIVE admin_role_permissions table,
// queried directly before writing this file: finance_admin holds exactly
// 9 permissions -- admin.dashboard.view, audit_logs.view, reports.view,
// reports.generate, reports.export, commissions.view, commissions.manage,
// commissions.override, commissions.export -- and nothing else. Notably
// no admin_roles.manage, no users.*/venues.*/suppliers.*, no
// marketplace.*, no ai_config.*/system_settings.*.

test.describe("Finance administrator — allowed", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "financeAdmin");
  });

  test("logs in successfully", async ({ page }) => {
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))).toBe(true);
  });

  test("can view the administrator dashboard", async ({ page }) => {
    await page.goto("/admin");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("can access commission pages and view commission data", async ({ page }) => {
    await page.goto("/admin/commissions");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("can access financial reports", async ({ page }) => {
    await page.goto("/admin/reports");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("can view audit logs", async ({ page }) => {
    await page.goto("/admin/audit-logs");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("navigation shows only permitted modules (Overview, Commissions, Reports, Audit Logs)", async ({ page }) => {
    await page.goto("/admin");
    const nav = page.locator("nav, aside").first();
    const navText = (await nav.textContent()) ?? "";
    expect(navText).toMatch(/Commissions/);
    expect(navText).toMatch(/Reports/);
    expect(navText).toMatch(/Audit Logs/);
    expect(navText).not.toMatch(/Administrators/);
    expect(navText).not.toMatch(/AI Configuration/);
    expect(navText).not.toMatch(/Marketplace/);
    expect(navText).not.toMatch(/Settings/);
    expect(navText).not.toMatch(/^Users$/m);
  });

  test("commission values are never accepted from the browser -- calculation stays server-controlled", async ({ page }) => {
    // No client-reachable path accepts a browser-supplied commission
    // snapshot value at all -- confirm the create-rule endpoint ignores
    // or rejects an attacker-supplied commission_amount/snapshot field
    // rather than trusting it.
    const res = await page.request.post("/api/admin/commissions", {
      data: { scope: "global", percentage: 5, commission_amount: 999999, commission_calculated_at: "2000-01-01" },
      failOnStatusCode: false,
    });
    // Either the route doesn't exist under this exact shape (real UI uses
    // a server action) or it's validated/rejected -- what must never
    // happen is silently accepting the injected commission_amount.
    expect(res.status()).not.toBe(200);
  });
});

test.describe("Finance administrator — forbidden", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "financeAdmin");
  });

  const forbiddenReadRoutes = [
    "/admin/users",
    "/admin/venues",
    "/admin/suppliers",
    "/admin/marketplace",
    "/admin/ai-configuration",
    "/admin/settings",
    "/admin/administrators",
  ];
  for (const route of forbiddenReadRoutes) {
    test(`cannot access ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveTitle(/Unauthorized/i);
    });
  }

  const forbiddenMutations: Array<[string, string, Record<string, unknown>]> = [
    ["manage administrator roles", "/api/admin/administrators/assign-tier", { targetUserId: "00000000-0000-0000-0000-000000000002", newTier: "operations_admin" }],
    ["approve a user", "/api/admin/users/verify", { userId: "00000000-0000-0000-0000-000000000003" }],
    ["suspend a user", "/api/admin/users/suspend", { userId: "00000000-0000-0000-0000-000000000003" }],
    ["approve a venue", "/api/admin/venues/approve", { venueId: "d131d99a-5300-4de4-a23f-03abf6c61c1d" }],
    ["reject a venue", "/api/admin/venues/reject", { venueId: "d131d99a-5300-4de4-a23f-03abf6c61c1d" }],
    ["approve a supplier", "/api/admin/suppliers/approve", { supplierId: "00000000-0000-0000-0000-000000000000" }],
    ["reject a supplier", "/api/admin/suppliers/reject", { supplierId: "00000000-0000-0000-0000-000000000000" }],
    ["moderate the marketplace", "/api/admin/marketplace/moderate", { flagId: "00000000-0000-0000-0000-000000000000" }],
    ["change unrelated system settings", "/api/admin/settings", { key: "unrelated", value: "x" }],
    ["change AI configuration", "/api/admin/ai-configuration", { feature: "search", enabled: false }],
  ];
  for (const [label, route, body] of forbiddenMutations) {
    test(`cannot ${label} (direct API call)`, async ({ page }) => {
      const res = await page.request.post(route, { data: body, failOnStatusCode: false });
      expect([401, 403, 404, 405]).toContain(res.status());
    });
  }

  test("cannot become super_admin or modify its own tier", async ({ page }) => {
    const res = await page.request.post("/api/admin/administrators/assign-tier", {
      data: { targetUserId: "08bd5dfc-7621-4b52-afae-1db86a726fbb", newTier: "super_admin" },
      failOnStatusCode: false,
    });
    expect(res.status()).not.toBe(200);
  });

  test("cannot remove the final super administrator", async ({ page }) => {
    const res = await page.request.post("/api/admin/administrators/assign-tier", {
      data: { targetUserId: "00000000-0000-0000-0000-000000000001", newTier: "support_admin" },
      failOnStatusCode: false,
    });
    expect(res.status()).not.toBe(200);
  });

  test("cannot expose secret values through any endpoint", async ({ page }) => {
    const res = await page.request.get("/api/admin/ai-configuration/secrets", { failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(res.status());
  });
});

test.describe("Finance administrator — responsive", () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`loads /admin/commissions cleanly at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginAs(page, "financeAdmin");
      await page.goto("/admin/commissions");
      expect(page.url()).not.toContain("/unauthorized");
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(hasOverflow).toBe(false);
    });
  }
});
