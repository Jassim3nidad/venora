import { expect, test, type Page } from "@playwright/test";
import { loginAs, type Role } from "../helpers/auth";

/**
 * Runtime smoke for brief: Payment monitoring (/admin/payments).
 * Prefers superadmin (full admin); falls back to financeAdmin if present.
 */
function paymentsAdminRole(): Role | null {
  if (
    process.env.E2E_SUPERADMIN_EMAIL &&
    process.env.E2E_SUPERADMIN_PASSWORD
  ) {
    return "superadmin";
  }
  if (
    process.env.E2E_FINANCE_ADMIN_EMAIL &&
    process.env.E2E_FINANCE_ADMIN_PASSWORD
  ) {
    return "financeAdmin";
  }
  return null;
}

async function loginPaymentsAdmin(page: Page) {
  const role = paymentsAdminRole();
  test.skip(
    !role,
    "Set E2E_SUPERADMIN_* (or E2E_FINANCE_ADMIN_*) in apps/web/.env.local",
  );
  await loginAs(page, role!);
}

test.describe("Admin payment monitoring QA", () => {
  test("unauthenticated visitor is kept off /admin/payments", async ({
    page,
  }) => {
    await page.goto("/admin/payments");
    await expect(page).toHaveURL(/login|unauthorized/i);
    await expect(
      page.getByRole("heading", { name: "Payments & Refunds" }),
    ).toHaveCount(0);
  });

  test("admin can open Payments workspace with KPIs and panels", async ({
    page,
  }) => {
    await loginPaymentsAdmin(page);

    await page.goto("/admin");
    await expect(page).not.toHaveURL(/unauthorized/i);
    const modules = page.getByTestId("admin-modules-panel");
    await expect(modules.getByText("Payments & Refunds")).toBeVisible();

    await page.goto("/admin/payments");
    await expect(page).not.toHaveURL(/unauthorized/i);
    await expect(
      page.getByRole("heading", { name: "Payments & Refunds", exact: true }),
    ).toBeVisible();

    await expect(page.getByText("Paid volume")).toBeVisible();
    await expect(page.getByText("Pending payments")).toBeVisible();
    await expect(page.getByText("Failed payments")).toBeVisible();
    await expect(page.getByText("Open refunds")).toBeVisible();
    await expect(page.getByText("Failed webhooks")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Transactions", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Refunds", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Webhook attention", exact: true }),
    ).toBeVisible();

    await expect(page.locator('select[name="status"]')).toBeVisible();
    await expect(page.locator('select[name="provider"]')).toBeVisible();
    await expect(page.locator('select[name="refundStatus"]')).toBeVisible();

    await page.locator('select[name="status"]').selectOption("paid");
    await page
      .locator("form")
      .filter({ has: page.locator('select[name="status"]') })
      .getByRole("button", { name: "Apply" })
      .click();
    await page.waitForURL(/\/admin\/payments\?.*status=paid/);
    await expect(
      page.getByRole("heading", { name: "Payments & Refunds", exact: true }),
    ).toBeVisible();
  });

  test("admin nav exposes Payments", async ({ page }) => {
    await loginPaymentsAdmin(page);
    await page.goto("/admin/payments");
    const nav = page.locator("nav, aside").first();
    await expect(
      page.locator('nav a[href="/admin/payments"]'),
    ).toBeVisible();
  });

  test("customer cannot access /admin/payments", async ({ page }) => {
    test.skip(
      !process.env.E2E_CUSTOMER_EMAIL || !process.env.E2E_CUSTOMER_PASSWORD,
      "Set E2E_CUSTOMER_EMAIL/PASSWORD in apps/web/.env.local",
    );
    await loginAs(page, "customer");
    await page.goto("/admin/payments");
    await expect(page).toHaveURL(/unauthorized|login|account/i);
    await expect(
      page.getByRole("heading", { name: "Payments & Refunds" }),
    ).toHaveCount(0);
  });
});
