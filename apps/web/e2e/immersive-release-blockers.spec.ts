import { expect, test } from "@playwright/test";

type BrowserEvidence = {
  console: string[];
  failedResponses: string[];
  pageErrors: string[];
};

function collectEvidence(page: import("@playwright/test").Page) {
  const evidence: BrowserEvidence = {
    console: [],
    failedResponses: [],
    pageErrors: [],
  };

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      evidence.console.push(`[${message.type()}] ${message.text()}`);
    }
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      evidence.failedResponses.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });

  page.on("pageerror", (error) => {
    evidence.pageErrors.push(error.message);
  });

  return evidence;
}

test("anonymous public venue does not emit hydration warnings or unexpected 401s", async ({
  page,
}) => {
  const evidence = collectEvidence(page);

  await page.goto("/venues/amorita-resort", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /amorita resort/i }),
  ).toBeVisible();
  await page.waitForTimeout(2500);

  expect(evidence.console.filter((line) => /hydrated|hydration/i.test(line))).toEqual(
    [],
  );
  expect(evidence.failedResponses.filter((line) => /^401 /.test(line))).toEqual(
    [],
  );
  expect(evidence.pageErrors).toEqual([]);
});
