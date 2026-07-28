import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

export const vercelBypassStorageStatePath = join(
  tmpdir(),
  `venora-playwright-${process.env.GITHUB_RUN_ID ?? "local"}-vercel-bypass.json`,
);

export default async function globalSetup(config: FullConfig) {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  const configuredBaseUrl = config.projects[0]?.use.baseURL;
  if (!secret || typeof configuredBaseUrl !== "string") return;

  const baseUrl = new URL(configuredBaseUrl);
  if (["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname)) return;

  baseUrl.searchParams.set("x-vercel-protection-bypass", secret);
  baseUrl.searchParams.set("x-vercel-set-bypass-cookie", "true");

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const response = await page.goto(baseUrl.toString(), {
      waitUntil: "domcontentloaded",
    });
    if (!response?.ok()) {
      throw new Error(
        `Vercel automation bypass failed with status ${response?.status() ?? "unknown"}.`,
      );
    }

    const cookies = await context.cookies(baseUrl.origin);
    if (cookies.length === 0) {
      throw new Error("Vercel automation bypass did not set a browser cookie.");
    }
    await context.storageState({ path: vercelBypassStorageStatePath });
  } finally {
    await browser.close();
  }

  return async () => {
    await rm(vercelBypassStorageStatePath, { force: true });
  };
}
