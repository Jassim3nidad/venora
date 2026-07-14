import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];
const required = [
  "APP_BASE_URL",
  "PRODUCTION_BASE_URL",
  "STAGING_ALLOWED_HOSTS",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STAGING_DB_URL",
  "STAGING_SUPABASE_PROJECT_REF",
  "PRODUCTION_SUPABASE_PROJECT_REF",
  "E2E_CUSTOMER_EMAIL",
  "E2E_CUSTOMER_PASSWORD",
  "E2E_VENUE_EMAIL",
  "E2E_VENUE_PASSWORD",
  "E2E_COORDINATOR_EMAIL",
  "E2E_COORDINATOR_PASSWORD",
  "E2E_SUPPLIER_EMAIL",
  "E2E_SUPPLIER_PASSWORD",
  "E2E_SUPERADMIN_EMAIL",
  "E2E_SUPERADMIN_PASSWORD",
  "E2E_ANALYST_ADMIN_EMAIL",
  "E2E_ANALYST_ADMIN_PASSWORD",
  "E2E_FINANCE_ADMIN_EMAIL",
  "E2E_FINANCE_ADMIN_PASSWORD",
  "RLS_TENANT_A_EMAIL",
  "RLS_TENANT_A_PASSWORD",
  "RLS_TENANT_B_EMAIL",
  "RLS_TENANT_B_PASSWORD",
  "RLS_NON_MEMBER_EMAIL",
  "RLS_NON_MEMBER_PASSWORD",
];

for (const name of required) {
  if (!process.env[name]?.trim())
    errors.push(`missing protected configuration: ${name}`);
}
if (process.env.VENORA_TEST_ENVIRONMENT !== "confirmed") {
  errors.push("VENORA_TEST_ENVIRONMENT must equal confirmed");
}
if (process.env.VENORA_ENVIRONMENT_CLASS !== "staging") {
  errors.push("VENORA_ENVIRONMENT_CLASS must equal staging");
}

function parseUrl(name) {
  try {
    const value = new URL(process.env[name]);
    if (value.protocol !== "https:") errors.push(`${name} must use HTTPS`);
    if (["localhost", "127.0.0.1", "::1"].includes(value.hostname)) {
      errors.push(`${name} cannot target localhost`);
    }
    return value;
  } catch {
    errors.push(`${name} must be a valid URL`);
    return null;
  }
}

const appUrl = parseUrl("APP_BASE_URL");
const productionUrl = parseUrl("PRODUCTION_BASE_URL");
const supabaseUrl = parseUrl("NEXT_PUBLIC_SUPABASE_URL");
const allowHosts = (process.env.STAGING_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

if (appUrl && productionUrl && appUrl.hostname === productionUrl.hostname) {
  errors.push("staging application host matches production");
}
if (appUrl && !allowHosts.includes(appUrl.hostname.toLowerCase())) {
  errors.push("staging application host is not in STAGING_ALLOWED_HOSTS");
}
if (appUrl?.hostname === "venora-web.vercel.app") {
  errors.push(
    "known production application host is forbidden for hosted tests",
  );
}

const stagingRef = process.env.STAGING_SUPABASE_PROJECT_REF?.trim();
const productionRef = process.env.PRODUCTION_SUPABASE_PROJECT_REF?.trim();
if (stagingRef && productionRef && stagingRef === productionRef) {
  errors.push("staging Supabase project ref matches production");
}
if (
  supabaseUrl &&
  stagingRef &&
  !supabaseUrl.hostname.startsWith(`${stagingRef}.`)
) {
  errors.push(
    "NEXT_PUBLIC_SUPABASE_URL does not match STAGING_SUPABASE_PROJECT_REF",
  );
}
if (
  supabaseUrl &&
  productionRef &&
  supabaseUrl.hostname.startsWith(`${productionRef}.`)
) {
  errors.push("Supabase URL targets the production project");
}

try {
  const databaseUrl = new URL(process.env.SUPABASE_STAGING_DB_URL);
  if (!/^postgres(?:ql)?:$/.test(databaseUrl.protocol)) {
    errors.push("SUPABASE_STAGING_DB_URL must use PostgreSQL protocol");
  }
  const databaseIdentity = `${databaseUrl.username}:${databaseUrl.hostname}`;
  if (stagingRef && !databaseIdentity.includes(stagingRef)) {
    errors.push(
      "SUPABASE_STAGING_DB_URL does not identify the staging project",
    );
  }
  if (productionRef && databaseIdentity.includes(productionRef)) {
    errors.push("database URL targets the production project");
  }
} catch {
  errors.push("SUPABASE_STAGING_DB_URL must be a valid PostgreSQL URL");
}

if (errors.length > 0) {
  console.error(`BLOCKED: hosted environment guard failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const outputRoot = join(root, "artifacts", "ci");
mkdirSync(outputRoot, { recursive: true });
writeFileSync(
  join(outputRoot, "hosted-environment.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      status: "PASS",
      environmentClass: "staging",
      applicationHostAllowed: true,
      productionIsolation: true,
      dedicatedFixturesPresent: true,
    },
    null,
    2,
  )}\n`,
);
console.log(
  "Hosted environment guard passed: protected staging target and dedicated fixtures confirmed.",
);
