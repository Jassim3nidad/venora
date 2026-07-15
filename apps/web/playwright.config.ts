import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const appBaseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";
const isHostedTest = Boolean(process.env.APP_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : (undefined as any),
  reporter: "html",
  use: {
    actionTimeout: 0,
    baseURL: appBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
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
