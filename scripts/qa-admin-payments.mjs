/**
 * Lightweight unauthenticated + optional password QA for /admin/payments.
 * Does not rotate fixture passwords.
 *
 * Optional env (not required):
 *   E2E_FINANCE_ADMIN_EMAIL / E2E_FINANCE_ADMIN_PASSWORD
 *   E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD
 * Or known local fixtures via QA_FINANCE_PASSWORD / QA_CUSTOMER_PASSWORD
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(path.join(root, "apps/web/package.json"));
const { chromium } = require("@playwright/test");

const envPath = path.join(root, "apps/web/.env.local");
const baseURL = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

function loadEnv() {
  const out = { ...process.env };
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (!m) continue;
    let value = m[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (out[m[1]] === undefined) out[m[1]] = value;
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const env = loadEnv();
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: String(err?.message ?? err) });
    console.log(`FAIL  ${name}`);
    console.log(`      ${err?.message ?? err}`);
  }
}

async function login(page, email, password) {
  await page.goto(`${baseURL}/login`);
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click("#login-submit-btn");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
}

const financeEmail =
  env.E2E_FINANCE_ADMIN_EMAIL || "finance-admin@venora.local";
const financePassword =
  env.E2E_FINANCE_ADMIN_PASSWORD || env.QA_FINANCE_PASSWORD || "";
const customerEmail = env.E2E_CUSTOMER_EMAIL || "customer@venora.local";
const customerPassword =
  env.E2E_CUSTOMER_PASSWORD || env.QA_CUSTOMER_PASSWORD || "";

const browser = await chromium.launch();

await check("dev server responds", async () => {
  const res = await fetch(baseURL);
  assert(res.ok || res.status === 307 || res.status === 308, `HTTP ${res.status}`);
});

await check("unauthenticated blocked from /admin/payments", async () => {
  const ctx = await browser.newContext({ baseURL });
  const page = await ctx.newPage();
  await page.goto(`${baseURL}/admin/payments`);
  const url = page.url();
  assert(
    /login|unauthorized/i.test(url),
    `Expected login/unauthorized, got ${url}`,
  );
  assert(
    (await page.getByRole("heading", { name: "Payments & Refunds" }).count()) ===
      0,
    "Payments heading visible while unauthenticated",
  );
  await ctx.close();
});

if (financePassword) {
  await check("finance admin opens Payments workspace", async () => {
    const ctx = await browser.newContext({ baseURL });
    const page = await ctx.newPage();
    await login(page, financeEmail, financePassword);
    await page.goto(`${baseURL}/admin/payments`);
    assert(!/unauthorized/i.test(page.url()), "Unauthorized on /admin/payments");
    await page
      .getByRole("heading", { name: "Payments & Refunds" })
      .waitFor({ timeout: 20_000 });
    for (const label of [
      "Paid volume",
      "Pending payments",
      "Failed payments",
      "Open refunds",
      "Failed webhooks",
    ]) {
      await page.getByText(label).first().waitFor({ timeout: 10_000 });
    }
    await page.getByRole("heading", { name: "Transactions" }).waitFor();
    await page.getByRole("heading", { name: "Refunds" }).waitFor();
    await page.getByRole("heading", { name: "Webhook attention" }).waitFor();
    await page.locator('select[name="status"]').selectOption("paid");
    await page
      .locator("form")
      .filter({ has: page.locator('select[name="status"]') })
      .getByRole("button", { name: "Apply" })
      .click();
    await page.waitForURL(/\/admin\/payments\?.*status=paid/, {
      timeout: 15_000,
    });
    await ctx.close();
  });
} else {
  results.push({
    name: "finance admin opens Payments workspace",
    ok: false,
    error: "SKIPPED — no finance password (set E2E_FINANCE_ADMIN_PASSWORD)",
  });
  console.log(
    "SKIP  finance admin opens Payments workspace (no E2E_FINANCE_ADMIN_PASSWORD)",
  );
}

if (customerPassword) {
  await check("customer denied /admin/payments", async () => {
    const ctx = await browser.newContext({ baseURL });
    const page = await ctx.newPage();
    await login(page, customerEmail, customerPassword);
    await page.goto(`${baseURL}/admin/payments`);
    const url = page.url();
    const headingCount = await page
      .getByRole("heading", { name: "Payments & Refunds" })
      .count();
    assert(
      /unauthorized|login|account/i.test(url) || headingCount === 0,
      `Customer still saw payments UI at ${url}`,
    );
    await ctx.close();
  });
} else {
  results.push({
    name: "customer denied /admin/payments",
    ok: false,
    error: "SKIPPED — no customer password (set E2E_CUSTOMER_PASSWORD)",
  });
  console.log(
    "SKIP  customer denied /admin/payments (no E2E_CUSTOMER_PASSWORD)",
  );
}

await browser.close();

const skipped = results.filter((r) => String(r.error || "").startsWith("SKIPPED"));
const failed = results.filter(
  (r) => !r.ok && !String(r.error || "").startsWith("SKIPPED"),
);
const passed = results.filter((r) => r.ok);
console.log("");
console.log(
  `QA summary: ${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped`,
);
if (failed.length) process.exit(1);
if (skipped.length) process.exit(2);
