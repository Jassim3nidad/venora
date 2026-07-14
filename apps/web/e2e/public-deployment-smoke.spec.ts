import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const route of ["/", "/venues", "/login"] as const) {
  test(`public deployment smoke and accessibility: ${route}`, async ({
    page,
  }) => {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(
      response,
      `${route} did not return a navigation response`,
    ).not.toBeNull();
    expect(response!.status(), `${route} returned an error`).toBeLessThan(400);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const severe = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(
      severe.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      })),
    ).toEqual([]);
  });
}
