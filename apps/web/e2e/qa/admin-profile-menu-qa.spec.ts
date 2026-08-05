import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";

/**
 * Runtime smoke for the "Enter Admin Dashboard" entry in the profile
 * dropdown. Admins browsing the public marketplace previously had no way
 * back to /admin -- ProfileMenu had entries for venue owner, coordinator,
 * and supplier but no admin equivalent.
 *
 * MarketingNavbar renders ProfileMenu at two separate call sites (desktop
 * and mobile), so both viewports are covered here: a fix applied to only
 * one of them is the likely regression.
 */

const ADMIN_ITEM = "Enter Admin Dashboard";

async function openProfileMenu(page: Page) {
  await page.getByRole("button", { name: "Open account menu" }).first().click();
}

test.describe("Profile menu admin dashboard entry", () => {
  test("superadmin sees the entry on desktop and it opens /admin", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_SUPERADMIN_EMAIL || !process.env.E2E_SUPERADMIN_PASSWORD,
      "Set E2E_SUPERADMIN_* in apps/web/.env.local",
    );
    await loginAs(page, "superadmin");

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await openProfileMenu(page);

    const item = page.getByRole("menuitem", { name: ADMIN_ITEM });
    await expect(item).toBeVisible();

    await item.click();
    await expect(page).toHaveURL(/\/admin(\?|$|\/)/);
    await expect(page).not.toHaveURL(/unauthorized/i);
  });

  test("superadmin sees the entry on mobile (second call site)", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_SUPERADMIN_EMAIL || !process.env.E2E_SUPERADMIN_PASSWORD,
      "Set E2E_SUPERADMIN_* in apps/web/.env.local",
    );
    await loginAs(page, "superadmin");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await openProfileMenu(page);

    await expect(page.getByRole("menuitem", { name: ADMIN_ITEM })).toBeVisible();
  });

  test("customer without the admin role never sees the entry", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_CUSTOMER_EMAIL || !process.env.E2E_CUSTOMER_PASSWORD,
      "Set E2E_CUSTOMER_* in apps/web/.env.local",
    );
    await loginAs(page, "customer");

    await page.goto("/");
    await openProfileMenu(page);

    // the menu is open -- a known item must be present before asserting absence
    await expect(page.getByRole("menuitem", { name: "Account Center" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: ADMIN_ITEM })).toHaveCount(0);
  });
});
