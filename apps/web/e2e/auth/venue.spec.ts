import { test, expect } from "@playwright/test";
import { loginAs, VIEWPORTS } from "../helpers/auth";

// Authenticated E2E for the venue-owner role, using the dedicated QA
// fixture owner@venora.local. See customer.spec.ts for the RLS-testing
// scope note (app-layer, not raw PostgREST with an extracted token).

test.describe("Venue role", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "venue");
  });

  test("logs in successfully", async ({ page }) => {
    const cookies = await page.context().cookies();
    expect(
      cookies.some(
        (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"),
      ),
    ).toBe(true);
  });

  test("can access the venue-owner dashboard and its own venue/booking routes", async ({
    page,
  }) => {
    await page.goto("/dashboard/venue-owner");
    expect(page.url()).not.toContain("/unauthorized");
    expect(page.url()).not.toContain("/login");

    await page.goto("/dashboard/venues");
    expect(page.url()).not.toContain("/unauthorized");

    await page.goto("/dashboard/bookings");
    expect(page.url()).not.toContain("/unauthorized");
  });

  test("cannot access /admin or any admin subroute", async ({ page }) => {
    for (const path of [
      "/admin",
      "/admin/venues",
      "/admin/commissions",
      "/admin/administrators",
    ]) {
      await page.goto(path);
      await expect(page).toHaveTitle(/Unauthorized/i);
    }
  });

  test("cannot access the supplier dashboard", async ({ page }) => {
    await page.goto("/dashboard/supplier");
    await expect(page).toHaveTitle(/Unauthorized/i);
  });

  test("cannot approve its own platform application through admin APIs", async ({
    page,
  }) => {
    const res = await page.request.post("/api/admin/venues/approve", {
      data: {},
      failOnStatusCode: false,
    });
    expect([401, 403, 404, 405]).toContain(res.status());
  });

  test("cannot change administrator roles or commission rules via admin APIs", async ({
    page,
  }) => {
    const roleRes = await page.request.post(
      "/api/admin/administrators/assign-tier",
      { data: {}, failOnStatusCode: false },
    );
    expect([401, 403, 404, 405]).toContain(roleRes.status());

    const commissionRes = await page.request.post("/api/admin/commissions", {
      data: {},
      failOnStatusCode: false,
    });
    expect([401, 403, 404, 405]).toContain(commissionRes.status());
  });
});

test.describe("Venue role — responsive", () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`loads the venue-owner dashboard cleanly at ${name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await loginAs(page, "venue");
      await page.goto("/dashboard/venue-owner");
      expect(page.url()).not.toContain("/unauthorized");
      const hasOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      );
      expect(hasOverflow).toBe(false);
    });
  }
});
