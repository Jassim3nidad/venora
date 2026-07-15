import { expect, test, type Locator, type Page } from "@playwright/test";

test("landing search suggestions support keyboard selection and GET filters", async ({
  page,
}) => {
  await page.goto("/");

  const location = page.getByRole("combobox", { name: "Location" });
  await location.fill("puerto");
  await expect(
    page.getByRole("option", { name: "Puerto Princesa City, Palawan" }),
  ).toBeVisible();
  await location.press("ArrowDown");
  await location.press("Enter");
  await expect(location).toHaveValue("Puerto Princesa City, Palawan");

  const eventType = page.getByRole("combobox", { name: "Event Type" });
  await eventType.fill("wed");
  await eventType.press("ArrowDown");
  await eventType.press("Enter");
  await expect(eventType).toHaveValue("Destination Wedding");

  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL("**/venues?**");
  const searchUrl = new URL(page.url());
  expect(searchUrl.pathname).toBe("/venues");
  expect(searchUrl.searchParams.get("location")).toBe(
    "Puerto Princesa City, Palawan",
  );
  expect(searchUrl.searchParams.get("event")).toBe("Destination Wedding");
  await expect(
    page.getByRole("heading", { name: "Astoria Palawan", exact: true }),
  ).toBeVisible();
});

test("featured venue card identity matches its destination", async ({ page }) => {
  await page.goto("/");

  const featuredRegion = page.getByRole("region", {
    name: "Featured Venues",
  });
  const firstCard = featuredRegion.getByRole("article").first();
  const cardHeading = await firstCard.getByRole("heading").innerText();
  const cardLink = firstCard.getByRole("link");
  const destination = await cardLink.getAttribute("href");

  expect(destination).toMatch(/^\/venues\//);
  await cardLink.click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`), {
    timeout: 30_000,
  });

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    cardHeading.trim(),
    { timeout: 30_000 },
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

  await expect(page).toHaveURL(
    (url) => {
      return (
        url.pathname === "/login" &&
        url.searchParams.get("redirectTo") === "/" &&
        url.searchParams.get("prompt") === "favorites"
      );
    },
    { timeout: 30_000 },
  );
});

test("venue estimate uses booking guests without public package sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/venues/the-blue-leaf-filipinas");

  await expect(
    page.getByRole("heading", { name: "Available packages" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Compare Packages" }),
  ).toHaveCount(0);

  const bookingGuests = page.getByRole("spinbutton", {
    name: "Guests count",
  });
  await bookingGuests.fill("200");
  await page.getByRole("button", { name: "Estimate Event Cost" }).click();

  const estimator = page.getByRole("dialog");
  await expect(
    estimator.getByRole("spinbutton", { name: "Guest Count" }),
  ).toHaveValue("200");
});

async function expectDesktopSupportingCardOffset(
  page: Page,
  card: Locator,
) {
  await expect(card).toBeVisible();
  const styles = await card.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { position: computed.position, top: computed.top };
  });

  expect(styles).toEqual({ position: "sticky", top: "152px" });

  const cardDocumentTop = await card.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    Math.max(0, cardDocumentTop - 32),
  );
  await expect
    .poll(() =>
      card.evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBe(152);
}

test("supplier profile removes back control and keeps proposal card sticky", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/suppliers/qa-supplier");

  await expect(
    page.getByRole("link", { name: /Back to suppliers/i }),
  ).toHaveCount(0);
  await expectDesktopSupportingCardOffset(
    page,
    page.locator("#supplier-request-card").first().locator(".."),
  );
});

test("venue profile keeps the booking card below the header stack", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/venues/the-blue-leaf-filipinas");

  await expectDesktopSupportingCardOffset(
    page,
    page.getByTestId("venue-booking-sidebar"),
  );
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
