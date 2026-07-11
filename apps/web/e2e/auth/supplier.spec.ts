import { test, expect } from "@playwright/test";
import { loginAs, VIEWPORTS } from "../helpers/auth";

// Authenticated E2E for the supplier role, using the dedicated QA fixture
// supplier@venora.local. See customer.spec.ts for the RLS-testing scope
// note.

test.describe("Supplier role", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "supplier");
  });

  test("logs in successfully", async ({ page }) => {
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))).toBe(true);
  });

  test("can access the supplier dashboard and its own records", async ({ page }) => {
    await page.goto("/dashboard/supplier");
    expect(page.url()).not.toContain("/unauthorized");
    expect(page.url()).not.toContain("/login");

    await page.goto("/dashboard/supplier/bookings");
    expect(page.url()).not.toContain("/unauthorized");

    await page.goto("/dashboard/supplier/profile");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("cannot access /admin or any admin subroute", async ({ page }) => {
    for (const path of ["/admin", "/admin/suppliers", "/admin/commissions", "/admin/administrators"]) {
      await page.goto(path);
      await expect(page).toHaveTitle(/Unauthorized/i);
    }
  });

  test("cannot access the venue-owner dashboard", async ({ page }) => {
    await page.goto("/dashboard/venue-owner");
    await expect(page).toHaveTitle(/Unauthorized/i);
  });

  test("cannot approve its own platform application through admin APIs", async ({ page }) => {
    const res = await page.request.post("/api/admin/suppliers/approve", { data: {}, failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(res.status());
  });

  test("cannot change commission rules via admin APIs", async ({ page }) => {
    const res = await page.request.post("/api/admin/commissions", { data: {}, failOnStatusCode: false });
    expect([401, 403, 404, 405]).toContain(res.status());
  });
});

test.describe("Supplier role — responsive", () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`loads the supplier dashboard cleanly at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginAs(page, "supplier");
      await page.goto("/dashboard/supplier");
      expect(page.url()).not.toContain("/unauthorized");
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(hasOverflow).toBe(false);
    });
  }
});
