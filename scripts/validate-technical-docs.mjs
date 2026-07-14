import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docsRoot = join(root, "docs");
const runbooksRoot = join(docsRoot, "runbooks");
const errors = [];
let historicalSourceExceptions = 0;
let localConfigurationExceptions = 0;

const allowedHistoricalMissingSources = new Set([
  "supabase/migrations/053_supplier_dashboard_domains.sql",
  "apps/web/src/features/suppliers/application/dashboard-actions.test.ts",
  "apps/web/app/(supplier)/dashboard/supplier/_components/inquiry-filters.tsx",
  "apps/web/app/(supplier)/dashboard/supplier/_components/quote-actions.tsx",
  "apps/web/src/features/suppliers/ui/SupplierAvailabilityEditor.tsx",
]);
const allowedLocalConfigurationSources = new Set([
  "apps/web/.env",
  "apps/web/.env.local",
]);

const requiredDocs = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  ".env.example",
  "docs/README.md",
  "docs/getting-started.md",
  "docs/environment-variables.md",
  "docs/repository-structure.md",
  "docs/architecture.md",
  "docs/authentication.md",
  "docs/authorization.md",
  "docs/database.md",
  "docs/migrations.md",
  "docs/storage.md",
  "docs/bookings.md",
  "docs/payments.md",
  "docs/notifications.md",
  "docs/analytics.md",
  "docs/ai.md",
  "docs/testing.md",
  "docs/deployment.md",
  "docs/troubleshooting.md",
  "docs/known-limitations.md",
  "docs/documentation-inventory.md",
  "docs/runbooks/README.md",
];

const expectedEnvVariables = [
  "AI_SEARCH_EMBED_REFRESH_LIMIT",
  "ANALYZE",
  "APP_BASE_URL",
  "APP_URL",
  "CI",
  "E2E_ANALYST_ADMIN_EMAIL",
  "E2E_ANALYST_ADMIN_PASSWORD",
  "E2E_COORDINATOR_EMAIL",
  "E2E_COORDINATOR_PASSWORD",
  "E2E_CUSTOMER_EMAIL",
  "E2E_CUSTOMER_PASSWORD",
  "E2E_FINANCE_ADMIN_EMAIL",
  "E2E_FINANCE_ADMIN_PASSWORD",
  "E2E_SUPERADMIN_EMAIL",
  "E2E_SUPERADMIN_PASSWORD",
  "E2E_SUPPLIER_EMAIL",
  "E2E_SUPPLIER_PASSWORD",
  "E2E_VENUE_EMAIL",
  "E2E_VENUE_PASSWORD",
  "MAYA_SECRET_KEY",
  "MAYA_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "NODE_ENV",
  "NOTIFICATION_TEST_EMAIL",
  "NOTIFICATION_TEST_PASSWORD",
  "NOTIFICATION_TEST_USER_ID",
  "OPENAI_API_KEY",
  "OPENAI_EMBEDDING_MODEL",
  "OPENROUTER_API_KEY",
  "PAYMONGO_SECRET_KEY",
  "PAYMONGO_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "VAPID_PRIVATE_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_SUBJECT",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
];

const runbookHeadings = [
  "Purpose",
  "Symptoms",
  "Impact",
  "Preconditions",
  "Safety warnings",
  "Investigation steps",
  "Diagnostic commands",
  "Expected evidence",
  "Resolution steps",
  "Validation",
  "Rollback or recovery",
  "Escalation criteria",
  "Required secrets or permissions",
  "Related documentation",
];

function walk(directory, predicate, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, predicate, output);
    else if (predicate(fullPath)) output.push(fullPath);
  }
  return output;
}

function display(file) {
  return relative(root, file).split(sep).join("/");
}

for (const file of requiredDocs) {
  if (!existsSync(join(root, file)))
    errors.push(`required file missing: ${file}`);
}

const markdownFiles = [
  join(root, "README.md"),
  join(root, "CONTRIBUTING.md"),
  join(root, "SECURITY.md"),
  ...walk(docsRoot, (file) => extname(file) === ".md"),
];
const titles = new Map();
let mermaidCount = 0;

for (const file of markdownFiles) {
  const source = readFileSync(file, "utf8");
  const h1 = source.match(/^# (.+)$/m)?.[1]?.trim();
  if (!h1) errors.push(`missing H1 title: ${display(file)}`);
  else if (titles.has(h1))
    errors.push(
      `duplicate document title "${h1}": ${titles.get(h1)} and ${display(file)}`,
    );
  else titles.set(h1, display(file));

  const allFences = source.match(/^```/gm)?.length ?? 0;
  if (allFences % 2 !== 0)
    errors.push(`unbalanced Markdown fence: ${display(file)}`);
  for (const diagram of source.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)) {
    mermaidCount += 1;
    const declaration = diagram[1].trimStart().split(/\r?\n/, 1)[0].trim();
    if (
      !/^(?:flowchart (?:TD|TB|BT|RL|LR)|sequenceDiagram|stateDiagram-v2)$/.test(
        declaration,
      )
    ) {
      errors.push(
        `unsupported Mermaid declaration in ${display(file)}: ${declaration}`,
      );
    }
  }

  let expectedPipes = null;
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!/^\s*\|/.test(line)) {
      expectedPipes = null;
      continue;
    }
    const pipes = line.match(/(?<!\\)\|/g)?.length ?? 0;
    expectedPipes ??= pipes;
    if (pipes !== expectedPipes)
      errors.push(
        `malformed table ${display(file)}:${index + 1} (${pipes} vs ${expectedPipes} pipes)`,
      );
  }

  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (!href || /^(?:https?:|mailto:|tel:)/i.test(href)) continue;
    const target = href.startsWith("/")
      ? join(root, href)
      : resolve(dirname(file), href);
    if (!existsSync(target))
      errors.push(`broken local link in ${display(file)}: ${match[1]}`);
  }

  for (const match of source.matchAll(
    /`((?:apps|packages|supabase|scripts|docs)\/[^`\s]+)`/g,
  )) {
    const candidate = match[1].replace(/[),.;:]+$/, "");
    if (/[<>*{}]/.test(candidate) || candidate.includes("**")) continue;
    if (!existsSync(join(root, candidate))) {
      if (
        display(file) ===
          "docs/superpowers/plans/2026-07-11-supplier-dashboard-completion.md" &&
        allowedHistoricalMissingSources.has(candidate)
      ) {
        historicalSourceExceptions += 1;
      } else if (allowedLocalConfigurationSources.has(candidate)) {
        localConfigurationExceptions += 1;
      } else {
        errors.push(
          `referenced source path missing in ${display(file)}: ${candidate}`,
        );
      }
    }
  }
}

const architecture = readFileSync(join(docsRoot, "architecture.md"), "utf8");
const architectureDiagrams =
  architecture.match(/```mermaid\r?\n/g)?.length ?? 0;
if (architectureDiagrams < 10)
  errors.push(
    `architecture requires at least 10 Mermaid diagrams; found ${architectureDiagrams}`,
  );

const runbooks = readdirSync(runbooksRoot)
  .filter((name) => /^\d{2}-.+\.md$/.test(name))
  .sort();
if (runbooks.length !== 30)
  errors.push(`expected 30 focused runbooks; found ${runbooks.length}`);
for (const name of runbooks) {
  const source = readFileSync(join(runbooksRoot, name), "utf8");
  let position = -1;
  for (const heading of runbookHeadings) {
    const next = source.indexOf(`## ${heading}`, position + 1);
    if (next < 0) errors.push(`runbook ${name} missing heading: ${heading}`);
    else position = next;
  }
}

const envDocs = readFileSync(
  join(docsRoot, "environment-variables.md"),
  "utf8",
);
for (const name of expectedEnvVariables) {
  if (!envDocs.includes(`\`${name}\``))
    errors.push(`environment variable undocumented: ${name}`);
}
if (
  !/NEXT_PUBLIC_.*service-role/i.test(envDocs) &&
  !envDocs.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
)
  errors.push("environment guide must forbid public service-role exposure");

const rootPackage = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const scripts = new Set(Object.keys(rootPackage.scripts ?? {}));
const ignoredPnpmCommands = new Set([
  "add",
  "dlx",
  "exec",
  "install",
  "remove",
  "update",
]);
for (const file of markdownFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/^\s*pnpm(?:\s+run)?\s+([\w:-]+)/gm)) {
    const command = match[1];
    if (ignoredPnpmCommands.has(command) || command.startsWith("--")) continue;
    if (!scripts.has(command))
      errors.push(
        `undefined root package script in ${display(file)}: ${command}`,
      );
  }
}

const scanFiles = [
  ...markdownFiles,
  join(root, ".env.example"),
  join(root, "apps", "web", ".env.example"),
  join(root, "supabase", ".env.example"),
];
const localPathPattern =
  /(?:[A-Za-z]:\\(?:Users|home)\\|\/(?:Users|home)\/[^\s/]+\/)/;
const secretValuePatterns = [
  /\bsk_(?:live|test)_[A-Za-z0-9]{12,}\b/,
  /\bwhsec_[A-Za-z0-9]{12,}\b/,
  /\bsb_secret_[A-Za-z0-9_-]{12,}\b/,
  /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,
  /\beyJhbGciOiJ[A-Za-z0-9_-]{20,}\b/,
];
for (const file of scanFiles) {
  const source = readFileSync(file, "utf8");
  if (localPathPattern.test(source))
    errors.push(`absolute local path in ${display(file)}`);
  for (const pattern of secretValuePatterns) {
    if (pattern.test(source))
      errors.push(`secret-like value in ${display(file)}: ${pattern}`);
  }
}

const migrations = readFileSync(join(docsRoot, "migrations.md"), "utf8");
for (const file of [
  "0680_enforce_booking_availability_integrity.sql",
  "071_supplier_location_coverage.sql",
  "071_tighten_venue_media_storage_ownership.sql",
]) {
  if (!migrations.includes(file))
    errors.push(`known migration history conflict not documented: ${file}`);
}

if (errors.length > 0) {
  console.error(
    `Technical documentation validation failed (${errors.length}):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Technical documentation valid: ${requiredDocs.length} required files, ` +
    `${runbooks.length} runbooks, ${mermaidCount} Mermaid diagrams, ` +
    `${expectedEnvVariables.length} environment variables documented; ` +
    `${historicalSourceExceptions} inventoried historical source exceptions and ` +
    `${localConfigurationExceptions} local configuration references.`,
);
