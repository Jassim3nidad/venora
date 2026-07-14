import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docsRoot = join(root, "docs", "testing");
const errors = [];

const requiredDocs = [
  "test-strategy.md",
  "test-inventory.md",
  "coverage-matrix.md",
  "unit-tests.md",
  "integration-tests.md",
  "database-and-rls.md",
  "e2e-scenarios.md",
  "payment-tests.md",
  "security-tests.md",
  "accessibility-tests.md",
  "performance-tests.md",
  "test-data.md",
  "flakiness.md",
  "execution-guide.md",
  "final-test-report.md",
];

function walk(directory, predicate, output = []) {
  if (!existsSync(directory)) return output;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, predicate, output);
    else if (predicate(path)) output.push(path);
  }
  return output;
}

function display(file) {
  return relative(root, file).split(sep).join("/");
}

function readCall(source, openingIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openingIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (['"', "'", "`"].includes(character)) quote = character;
    else if (character === "(") depth += 1;
    else if (character === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(openingIndex + 1, index);
    }
  }

  return "";
}

for (const name of requiredDocs) {
  if (!existsSync(join(docsRoot, name))) {
    errors.push(`required test document missing: docs/testing/${name}`);
  }
}

const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const scripts = new Set(Object.keys(packageJson.scripts ?? {}));
for (const name of [
  "test:unit",
  "test:component",
  "test:integration",
  "test:database",
  "test:rls",
  "test:booking",
  "test:payment",
  "test:analytics",
  "test:ai",
  "test:security",
  "test:a11y",
  "test:e2e:smoke",
  "test:e2e",
  "test:performance",
  "test:secrets",
  "docs:test:validate",
  "validate:quality",
]) {
  if (!scripts.has(name)) errors.push(`required test command missing: ${name}`);
}

const testFiles = [
  ...walk(join(root, "apps", "web", "src"), (file) =>
    /\.test\.(?:ts|tsx)$/.test(file),
  ),
  ...walk(join(root, "apps", "web", "e2e"), (file) => /\.spec\.ts$/.test(file)),
  ...walk(join(root, "supabase", "functions"), (file) =>
    /\.test\.ts$/.test(file),
  ),
];

for (const file of testFiles) {
  const source = readFileSync(file, "utf8");
  if (/\b(?:test|it|describe)\.only\s*\(/.test(source)) {
    errors.push(`focused .only test remains: ${display(file)}`);
  }
  for (const match of source.matchAll(/\b(?:test|it|describe)\.skip\s*\(/g)) {
    const openingIndex = match.index + match[0].lastIndexOf("(");
    const call = readCall(source, openingIndex);
    if (!/,\s*["'`][^"'`]+["'`]/.test(call)) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      errors.push(`skipped test lacks reason: ${display(file)}:${line}`);
    }
  }
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (
      /(?:baseURL\s*:\s*|page\.goto\s*\(|request\.(?:get|post|put|patch|delete)\s*\()\s*["']https:\/\//.test(
        line,
      )
    ) {
      errors.push(
        `literal production-style test URL: ${display(file)}:${index + 1}`,
      );
    }
  }
  for (const pattern of [
    /\bsk_(?:live|test)_[A-Za-z0-9]{12,}\b/,
    /\bwhsec_[A-Za-z0-9]{12,}\b/,
    /\bsb_secret_[A-Za-z0-9_-]{12,}\b/,
    /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,
    /\beyJhbGciOiJ[A-Za-z0-9_-]{20,}\b/,
  ]) {
    if (pattern.test(source)) {
      errors.push(`credential-like fixture content: ${display(file)}`);
    }
  }
  if (
    /DROP\s+DATABASE|TRUNCATE[\s\S]{0,80}\bproduction\b|supabase\s+db\s+(?:reset|push)[^\n]*(?:--linked|production)/i.test(
      source,
    )
  ) {
    errors.push(
      `destructive production command in test source: ${display(file)}`,
    );
  }
}

const markdownFiles = [
  join(root, "docs", "testing.md"),
  ...requiredDocs.map((name) => join(docsRoot, name)).filter(existsSync),
];
for (const file of markdownFiles) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  if (!/^# .+/m.test(source)) errors.push(`missing H1: ${display(file)}`);
  if (/(?:[A-Za-z]:\\Users\\|\/(?:Users|home)\/[^\s/]+\/)/.test(source)) {
    errors.push(`absolute local path in test docs: ${display(file)}`);
  }
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].trim().replace(/^<|>$/g, "").split("#", 1)[0];
    if (!href || /^(?:https?:|mailto:|tel:)/i.test(href)) continue;
    const target = href.startsWith("/")
      ? join(root, href)
      : resolve(dirname(file), href);
    if (!existsSync(target)) {
      errors.push(`broken test-document link in ${display(file)}: ${match[1]}`);
    }
  }
  for (const match of source.matchAll(
    /`((?:apps|packages|supabase|scripts|docs)\/[^`\s]+)`/g,
  )) {
    const candidate = match[1].replace(/[),.;:]+$/, "");
    if (/[<>*{}]/.test(candidate)) continue;
    if (!existsSync(join(root, candidate))) {
      errors.push(
        `missing referenced test file in ${display(file)}: ${candidate}`,
      );
    }
  }
  for (const match of source.matchAll(/^\s*pnpm(?:\s+run)?\s+([\w:-]+)/gm)) {
    const command = match[1];
    if (command.startsWith("-") || ["exec", "dlx"].includes(command)) continue;
    if (!scripts.has(command)) {
      errors.push(
        `undefined root test command in ${display(file)}: ${command}`,
      );
    }
  }
}

const inventoryPath = join(docsRoot, "test-inventory.md");
if (existsSync(inventoryPath)) {
  const inventory = readFileSync(inventoryPath, "utf8");
  for (const heading of [
    "Test file",
    "Test category",
    "Feature covered",
    "User role",
    "Layer",
    "External dependency",
    "Data requirements",
    "Environment requirements",
    "Current execution status",
    "Reliability",
    "Missing assertions",
    "Duplicate coverage",
    "Gap",
    "Recommended action",
  ]) {
    if (!inventory.includes(heading))
      errors.push(`test inventory column missing: ${heading}`);
  }
  for (const category of [
    "Unit",
    "Component",
    "Integration",
    "Database",
    "RLS",
    "Booking",
    "Payment",
    "Notification",
    "Analytics",
    "AI",
    "Security",
    "Accessibility",
    "E2E",
    "Performance",
    "Documentation",
  ]) {
    if (!inventory.includes(category))
      errors.push(`test category absent from inventory: ${category}`);
  }
}

const matrixPath = join(docsRoot, "coverage-matrix.md");
if (existsSync(matrixPath)) {
  const matrix = readFileSync(matrixPath, "utf8");
  for (const feature of [
    "Authentication",
    "Role assignment",
    "Application approval",
    "Venue management",
    "Venue search",
    "Favorites",
    "Availability",
    "Booking workflow",
    "Payment workflow",
    "Refunds",
    "Receipts and invoices",
    "Supplier inquiries",
    "Reviews",
    "Notifications",
    "Analytics",
    "CSV/PDF exports",
    "Storage uploads",
    "Admin permissions",
    "Audit logs",
    "AI features",
    "Public pages",
    "Responsive navigation",
    "Accessibility behavior",
  ]) {
    if (!matrix.includes(feature))
      errors.push(`coverage feature missing: ${feature}`);
  }
  for (const status of [
    "FULLY AUTOMATED",
    "PARTIALLY AUTOMATED",
    "MANUAL ONLY",
    "IMPLEMENTED BUT UNTESTED",
    "BLOCKED",
    "NOT IMPLEMENTED",
  ]) {
    if (!matrix.includes(status))
      errors.push(`coverage status missing: ${status}`);
  }
}

if (errors.length > 0) {
  console.error(
    `Test-suite documentation validation failed (${errors.length}):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Test-suite documentation valid: ${requiredDocs.length} documents, ` +
    `${testFiles.length} executable test files, required commands and safety checks present.`,
);
