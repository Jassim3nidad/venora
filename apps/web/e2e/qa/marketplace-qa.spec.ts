import { expect, test, type Page } from "@playwright/test";

test("featured venue card identity matches its destination", async ({ page }) => {
  await page.goto("/");

  const featuredRegion = page.getByRole("region", {
    name: "Featured Venues",
  });
  const firstCard = featuredRegion.getByRole("article").first();
  const cardHeading = await firstCard.getByRole("heading").innerText();

  await firstCard.getByRole("link").click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    cardHeading.trim(),
  );
});

test("anonymous featured favorite opens login instead of venue details", async ({
  page,
}) => {
  await page.goto("/");

  const featuredRegion = page.getByRole("region", {
    name: "Featured Venues",
  });
  await featuredRegion
    .getByRole("button", { name: /^Add .* to favorites$/ })
    .first()
    .click();

  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/login" &&
      url.searchParams.get("redirectTo") === "/" &&
      url.searchParams.get("prompt") === "favorites"
    );
  });
});

test("marketplace uses document scrolling and renders a normal-flow footer", async ({
  page,
}) => {
  await page.goto("/venues");
  await expect(
    page.getByRole("link", { name: "Browse", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const scrollContract = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="marketplace-shell"]');
    const main = shell?.querySelector(":scope > main");

    return {
      documentOwnsScroll: document.scrollingElement === document.documentElement,
      shellOverflowY: shell ? getComputedStyle(shell).overflowY : null,
      mainOverflowY: main ? getComputedStyle(main).overflowY : null,
    };
  });

  expect(scrollContract).toEqual({
    documentOwnsScroll: true,
    shellOverflowY: "visible",
    mainOverflowY: "visible",
  });
});

async function expectStickyFiltersDuringDocumentScroll(
  page: Page,
  route: "/venues" | "/suppliers",
  filterLabel: "Venue filters" | "Supplier filters",
) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);

  const filters = page.getByRole("complementary", { name: filterLabel });
  const firstResultCard = page.locator("article").first();
  await expect(filters).toBeVisible();
  await expect(firstResultCard).toBeVisible();

  const before = await Promise.all([
    filters.evaluate((element) => element.getBoundingClientRect().top),
    firstResultCard.evaluate((element) => element.getBoundingClientRect().top),
  ]);

  await page.evaluate(() => window.scrollTo({ top: 64, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  const after = await Promise.all([
    filters.evaluate((element) => element.getBoundingClientRect().top),
    firstResultCard.evaluate((element) => element.getBoundingClientRect().top),
  ]);
  const scrollY = await page.evaluate(() => window.scrollY);

  expect(after[1]).toBeLessThan(before[1] - 40);
  expect(
    Math.abs(after[0] - before[0]),
    `filter/card geometry: ${JSON.stringify({ before, after, scrollY })}`,
  ).toBeLessThanOrEqual(1);
}

for (const listing of [
  { route: "/venues", filterLabel: "Venue filters" },
  { route: "/suppliers", filterLabel: "Supplier filters" },
] as const) {
  test(`${listing.route} keeps desktop filters sticky during document scroll`, async ({
    page,
  }) => {
    await expectStickyFiltersDuringDocumentScroll(
      page,
      listing.route,
      listing.filterLabel,
    );
  });
}
