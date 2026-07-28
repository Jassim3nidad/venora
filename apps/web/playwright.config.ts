import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const appBaseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";
const isHostedTest =
  appBaseUrl !== "http://127.0.0.1:3000" &&
  appBaseUrl !== "http://localhost:3000";
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

export default defineConfig({
  testDir: "./e2e",
  timeout: 60 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: "html",
  use: {
    actionTimeout: 0,
    baseURL: appBaseUrl,
    extraHTTPHeaders: protectionBypass
      ? {
          "x-vercel-protection-bypass": protectionBypass,
        }
      : undefined,
    trace: process.env.E2E_LOW_DISK === "true" ? "off" : "retain-on-failure",
    screenshot: process.env.E2E_LOW_DISK === "true" ? "off" : "only-on-failure",
    video: process.env.E2E_LOW_DISK === "true" ? "off" : "retain-on-failure",
  },
  ...(!isHostedTest
    ? {
        webServer: {
          command: "pnpm dev",
          url: appBaseUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["notifications"],
      },
    },
  ],
});
