import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DRAFT_KEY = "venora:event-plan-draft:v1";

const VIEWPORTS = {
  desktopLarge: { width: 1440, height: 900 },
  desktop: { width: 1280, height: 800 },
  tabletLandscape: { width: 1024, height: 768 },
  tabletPortrait: { width: 768, height: 1024 },
  mobileLarge: { width: 390, height: 844 },
  mobileSmall: { width: 360, height: 800 },
} as const;

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  expect(hasOverflow).toBe(false);
}

async function choose(page: import("@playwright/test").Page, name: string) {
  await page.getByLabel(name, { exact: true }).check();
}

async function completePlanToSummary(page: import("@playwright/test").Page) {
  await choose(page, "Wedding");
  await page.getByRole("button", { name: "Continue" }).click();

  await choose(page, "I have an exact date");
  await page.getByLabel("Event date").fill("2026-12-20");
  await page.getByLabel("Province").selectOption("Cavite");
  await page.getByLabel("City or municipality").selectOption("General Trias");
  await choose(page, "I am open to nearby locations");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Expected guest count").fill("150");
  await page.getByRole("button", { name: "Continue" }).click();

  await choose(page, "Garden");
  await choose(page, "Outdoor");
  await page.getByRole("button", { name: "Continue" }).click();

  await choose(page, "Parking");
  await page
    .getByLabel("Anything else the venue should provide?")
    .fill("Need a backup indoor option if it rains.");
  await page.getByRole("button", { name: "Continue" }).click();

  await choose(page, "Photography");
  await page.getByRole("button", { name: "Continue" }).click();

  await choose(page, "Compare both options");
  await choose(page, "Maybe");
  await choose(page, "Deposit followed by remaining balance");
  await choose(page, "I am still exploring");
  await choose(page, "Partner or family member");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(
    page.getByRole("heading", { name: "Event Plan Summary" }),
  ).toBeVisible();
}

test.describe("customer event planning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/plan-event");
    await page.evaluate((key) => {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem("venora:event-plan-pending-save:v1");
    }, DRAFT_KEY);
    await page.reload();
  });

  test("completes the anonymous journey, validates, edits, and returns to summary", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Event Basics" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Choose an event type" }),
    ).toBeVisible();
    await expect(page.getByLabel("Wedding", { exact: true })).toBeFocused();

    await completePlanToSummary(page);

    await page
      .locator("#summary-event-basics")
      .getByRole("button", { name: "Edit" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Event Basics" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Return to summary" }).click();
    await expect(page.locator("#summary-event-basics")).toBeFocused();
  });

  test("restores drafts and clears them only after confirmed start over", async ({
    page,
  }) => {
    await choose(page, "Wedding");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "Date and Location" }),
    ).toBeVisible();
    await expect(page.getByText("Saved on this device")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Planning session restored.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Date and Location" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Start over" }).click();
    const dialog = page.getByRole("dialog", { name: "Start over?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Keep planning" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Start over" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Keep planning" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Date and Location" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Start over" }).click();
    await dialog.getByRole("button", { name: "Start over" }).click();
    await expect(
      page.getByRole("heading", { name: "Event Basics" }),
    ).toBeFocused();
    await expect(
      page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY),
    ).resolves.toBeNull();
  });

  test("keeps anonymous plan data out of the login URL", async ({ page }) => {
    await completePlanToSummary(page);
    await page.getByRole("button", { name: "Save event plan" }).click();

    await page.waitForURL(/\/login\?redirectTo=/);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirectTo")).toBe("/plan-event");
    expect(url.search).not.toContain("wedding");
    expect(url.search).not.toContain("General");
    expect(url.search).not.toContain("150");
  });

  test("maps supported answers into venue search without budget parameters", async ({
    page,
  }) => {
    await completePlanToSummary(page);
    await page.getByRole("button", { name: "Find matching venues" }).click();
    await page.waitForURL(/\/venues\?/);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/venues");
    expect(url.searchParams.get("event")).toBe("wedding");
    expect(url.searchParams.get("province")).toBe("Cavite");
    expect(url.searchParams.get("city")).toBe("General Trias");
    expect(url.searchParams.get("capacity")).toBe("150");
    expect(url.searchParams.get("venueTypes")).toBe("garden");
    expect(url.searchParams.get("indoorOutdoor")).toBe("outdoor");
    expect(url.searchParams.get("amenities")).toContain("Parking");
    expect(url.searchParams.has("budgetMin")).toBe(false);
    expect(url.searchParams.has("budgetMax")).toBe(false);

    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Event Plan Summary" }),
    ).toBeVisible();
  });

  test("landing page keeps planning and venue browsing entry points", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /Start planning your event/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Browse venues/i })).toBeVisible();
    await page.getByRole("link", { name: /Start planning your event/i }).click();
    await expect(page).toHaveURL(/\/plan-event$/);
  });

  test("has no critical accessibility violations on the first step", async ({
    page,
  }) => {
    await page.goto("/plan-event");
    const results = await new AxeBuilder({ page })
      .disableRules(["region"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`renders without horizontal overflow at ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/plan-event");
      await expect(
        page.getByRole("heading", { name: "Event Basics" }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await choose(page, "Wedding");
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Date and Location" }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
