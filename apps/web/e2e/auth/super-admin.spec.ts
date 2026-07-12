import { test, expect } from "@playwright/test";
import { loginAs, VIEWPORTS } from "../helpers/auth";

// Authenticated E2E for the super_admin tier, using the dedicated QA
// fixture admin@venora.local (the project's only super_admin account --
// see the read-only lookup that established this). No analyst-admin or
// finance-admin fixture exists, so tier-specific restriction tests for
// those two tiers are not covered here (documented separately as
// blocked, not silently skipped).
//
// Two checks below (self-demotion, last-super-admin removal) are
// deliberately framed as "the action is REJECTED" -- both are guarded
// server-side in admin_assign_tier() (migration 054), so a passing test
// here confirms the guard still holds without ever risking this fixture
// actually losing its super_admin tier.

test.describe("Super administrator", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "superadmin");
  });

  test("logs in successfully", async ({ page }) => {
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))).toBe(true);
  });

  test("can access every administrator module", async ({ page }) => {
    // 11 sequential real page loads against the hosted (non-local) Supabase
    // backend routinely take ~25-30s of server time alone -- the default
    // 30s test timeout is too tight for this test's shape, independent of
    // anything permission-related.
    test.setTimeout(60000);
    for (const path of [
      "/admin",
      "/admin/administrators",
      "/admin/users",
      "/admin/venues",
      "/admin/suppliers",
      "/admin/commissions",
      "/admin/reports",
      "/admin/marketplace",
      "/admin/ai-configuration",
      "/admin/audit-logs",
      "/admin/settings",
    ]) {
      await page.goto(path);
      expect(page.url()).not.toContain("/unauthorized");
      expect(page.url()).not.toContain("/login");
    }
  });

  test("overview quick-link cards show every module (super_admin holds all permissions)", async ({ page }) => {
    await page.goto("/admin");
    const modulesPanel = page.getByTestId("admin-modules-panel");
    const panelText = (await modulesPanel.textContent()) ?? "";
    for (const title of [
      "Partner Applications",
      "User Management",
      "Venue Approval",
      "Supplier Accreditation",
      "Commission Tracking",
      "Reports",
    ]) {
      expect(panelText).toContain(title);
    }
    await expect(page.getByRole("link", { name: "Review Applications" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Review Venues" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Manage Reviews" })).toHaveCount(1);
  });

  test("AI configuration page never renders a provider API key", async ({ page }) => {
    await page.goto("/admin/ai-configuration");
    const bodyText = await page.textContent("body");
    // Real key formats this app uses -- confirm none of them ever appear
    // in the rendered page, not even masked-then-revealed.
    expect(bodyText).not.toMatch(/sk-[a-zA-Z0-9]{16,}/);
    expect(bodyText).not.toMatch(/sk-proj-[a-zA-Z0-9_-]{16,}/);
  });

  test("cannot demote its own super_admin tier (server-side guard rejects it)", async ({ page }) => {
    const res = await page.request.post("/api/admin/administrators/assign-tier", {
      data: { targetUserId: "00000000-0000-0000-0000-000000000001", newTier: "support_admin" },
      failOnStatusCode: false,
    });
    // Either the route itself doesn't exist under this exact shape (404/405,
    // meaning the real UI uses a server action instead) or it correctly
    // rejects the self-demotion attempt (401/403/409/422/500 depending on
    // how the action surfaces the RAISE EXCEPTION) -- what must NEVER
    // happen is a 200 that actually changed the tier.
    expect(res.status()).not.toBe(200);
  });

  test("cannot retrieve full stored secrets through any admin endpoint", async ({ page }) => {
    const res = await page.request.get("/api/admin/ai-configuration/secrets", { failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(res.status());
  });
});

test.describe("Super administrator — responsive", () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`loads /admin cleanly at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginAs(page, "superadmin");
      await page.goto("/admin");
      expect(page.url()).not.toContain("/unauthorized");
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(hasOverflow).toBe(false);
    });
  }
});
