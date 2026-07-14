import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationsRoot = join(root, "supabase", "migrations");
const typeFile = join(root, "packages", "database", "types", "generated.ts");
const allowlistFile = join(root, ".github", "ci", "migration-allowlist.json");
const errors = [];
const warnings = [];
const typesOnly = process.argv.includes("--types-only");
const allowlist = JSON.parse(readFileSync(allowlistFile, "utf8"));

function validateGeneratedTypes() {
  const generatedTypes = readFileSync(typeFile, "utf8");
  const portfolioTypes = generatedTypes.match(
    /supplier_portfolio_items:\s*\{[\s\S]*?\n\s{6}\};/,
  )?.[0];
  if (!portfolioTypes) {
    errors.push("generated supplier_portfolio_items type missing");
    return;
  }
  for (const field of ["image_urls", "status", "service_id", "venue_name"]) {
    if (!new RegExp(`\\b${field}:`).test(portfolioTypes)) {
      errors.push(`migration 070 field absent from generated types: ${field}`);
    }
  }
  for (const field of ["image_url", "title"]) {
    if (!new RegExp(`\\b${field}:\\s+string \\| null`).test(portfolioTypes)) {
      errors.push(`migration 070 nullable field drift: ${field}`);
    }
  }
}

validateGeneratedTypes();
if (typesOnly) {
  if (errors.length > 0) {
    console.error(
      `Generated database type validation failed (${errors.length}):`,
    );
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  console.log(
    "Generated database types valid: migration 070 contract fields and nullability present.",
  );
  process.exit(0);
}

const allMigrationSqlFiles = readdirSync(migrationsRoot)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const migrationFiles = allMigrationSqlFiles.filter((name) =>
  /^\d+_[a-z0-9][a-z0-9_]*\.sql$/.test(name),
);
for (const name of allMigrationSqlFiles) {
  if (!migrationFiles.includes(name)) {
    errors.push(`invalid migration filename: ${name}`);
  }
}
const migrations = migrationFiles.map((name) => ({
  name,
  version: name.match(/^(\d+)_/)?.[1] ?? "",
  number: Number(name.match(/^(\d+)_/)?.[1]),
  source: readFileSync(join(migrationsRoot, name), "utf8"),
}));
for (const migration of migrations) {
  if (!migration.source.trim())
    errors.push(`empty migration file: ${migration.name}`);
}
const allSql = migrations.map(({ source }) => source).join("\n");
const activeSql = allSql
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

const byNumber = new Map();
for (const migration of migrations) {
  const names = byNumber.get(migration.version) ?? [];
  names.push(migration.name);
  byNumber.set(migration.version, names);
}

for (const [version, names] of byNumber) {
  if (names.length < 2) continue;
  const exception = allowlist.duplicateVersions?.find(
    (item) =>
      item.version === version &&
      [...item.files].sort().join(",") === [...names].sort().join(","),
  );
  if (exception) {
    warnings.push(
      `allowlisted duplicate migration ${version}: ${names.join(", ")} (${exception.removalCondition})`,
    );
  } else {
    errors.push(`duplicate migration ${version}: ${names.join(", ")}`);
  }
}

for (let index = 1; index < migrations.length; index += 1) {
  const previous = migrations[index - 1];
  const current = migrations[index];
  if (current.number >= previous.number) continue;
  const orderingException = allowlist.orderingExceptions?.find(
    (item) => item.before === previous.name && item.after === current.name,
  );
  if (orderingException) {
    warnings.push(
      `allowlisted migration ordering exception: ${previous.name} before ${current.name}`,
    );
  } else {
    errors.push(
      `out-of-order migration filenames: ${previous.name} before ${current.name}`,
    );
  }
}

for (const table of [
  "profiles",
  "user_roles",
  "organizations",
  "organization_members",
  "venues",
  "bookings",
  "supplier_profiles",
  "supplier_contact_requests",
  "supplier_quotes",
  "reviews",
  "notifications",
  "audit_logs",
]) {
  const pattern = new RegExp(
    `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  if (!pattern.test(activeSql))
    errors.push(`critical table lacks RLS enablement: public.${table}`);
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" });
  } catch {
    return "";
  }
}

const baseSha = process.env.CI_BASE_SHA?.trim();
const range =
  baseSha && /^[0-9a-f]{40}$/i.test(baseSha) ? [baseSha, "HEAD"] : ["HEAD"];
const changedMigrationPaths = new Set([
  ...git(["diff", "--name-only", ...range, "--", "supabase/migrations/*.sql"])
    .split(/\r?\n/)
    .filter(Boolean),
  ...git(["diff", "--name-only", "--", "supabase/migrations/*.sql"])
    .split(/\r?\n/)
    .filter(Boolean),
  ...git([
    "ls-files",
    "--others",
    "--exclude-standard",
    "supabase/migrations/*.sql",
  ])
    .split(/\r?\n/)
    .filter(Boolean),
]);
const modifiedMigrations = git([
  "diff",
  "--name-only",
  "--diff-filter=M",
  ...range,
  "--",
  "supabase/migrations/*.sql",
])
  .split(/\r?\n/)
  .filter(Boolean);
for (const path of modifiedMigrations) {
  if (!allowlist.mutableMigrationFiles?.includes(path)) {
    errors.push(
      `existing migration modified without exact allowlist entry: ${path}`,
    );
  }
}

const destructivePatterns = [
  ["DROP_TABLE", /\bDROP\s+TABLE\b/i],
  ["DROP_COLUMN", /\bDROP\s+COLUMN\b/i],
  ["TRUNCATE", /\bTRUNCATE\b/i],
  ["DELETE_WITHOUT_WHERE", /\bDELETE\s+FROM\s+[\w.]+\s*;/i],
  ["ALTER_COLUMN_TYPE", /\bALTER\s+(?:COLUMN\s+)?[\w\"]+\s+TYPE\b/i],
];
const sensitivePatterns = [
  ["SECURITY_DEFINER", /\bSECURITY\s+DEFINER\b/i],
  [
    "STORAGE_POLICY",
    /(?:\b(?:CREATE|ALTER|DROP)\s+POLICY\b[\s\S]*?\bON\s+storage\.objects\b|\bALTER\s+TABLE\s+storage\.objects\b)/i,
  ],
  ["PUBLIC_GRANT", /\bGRANT\b[\s\S]*?\bTO\s+PUBLIC\b/i],
];
for (const path of changedMigrationPaths) {
  const name = path.replace(/^supabase\/migrations\//, "");
  const migration = migrations.find((item) => item.name === name);
  if (!migration) continue;
  for (const [kind, pattern] of destructivePatterns) {
    if (!pattern.test(migration.source)) continue;
    const allowed = allowlist.destructiveStatements?.some(
      (item) => item.file === path && item.kind === kind,
    );
    if (!allowed)
      errors.push(
        `destructive migration statement requires exact allowlist review: ${path} (${kind})`,
      );
  }
  for (const [kind, pattern] of sensitivePatterns) {
    if (!pattern.test(migration.source)) continue;
    const allowed = allowlist.sensitiveStatements?.some(
      (item) => item.file === path && item.kind === kind,
    );
    if (!allowed) {
      errors.push(
        `security-sensitive migration change requires exact allowlist review: ${path} (${kind})`,
      );
    }
  }
}

const requiredMigrations = [
  "001_extensions.sql",
  "010_rls.sql",
  "012_storage.sql",
  "021_booking_workflow_transactions.sql",
  "043_payments_platform.sql",
  "046_payment_confirmation_reconciliation.sql",
  "047_explicit_role_revoke.sql",
  "051_storage_policies_fix.sql",
  "053_restrict_verification_docs.sql",
  "054_admin_access_control.sql",
  "065_lock_down_internal_only_functions.sql",
  "068_customer_supplier_inquiry_tracking.sql",
  "068_enforce_booking_availability_integrity.sql",
  "070_supplier_portfolio_enhancements.sql",
  "071_tighten_venue_media_storage_ownership.sql",
];
for (const name of requiredMigrations) {
  if (!migrationFiles.includes(name))
    errors.push(`required migration missing: ${name}`);
}

for (const name of [
  "is_org_member_for_venue",
  "is_supplier_owner",
  "create_booking_inquiry",
  "cancel_booking_request",
  "claim_payment_webhook_event",
  "confirm_booking_payment",
  "has_admin_permission",
  "respond_supplier_quote_customer",
]) {
  if (!allSql.includes(`FUNCTION public.${name}`)) {
    errors.push(`required database function missing: public.${name}`);
  }
}

for (const name of [
  "bookings_status_history",
  "bookings_enforce_availability_integrity",
  "bookings_issue_deposit_invoice",
  "notifications_enqueue_deliveries",
  "prevent_self_role_change",
]) {
  if (!allSql.includes(`TRIGGER ${name}`)) {
    errors.push(`required trigger missing: ${name}`);
  }
}

for (const name of [
  "customers_view_own_bookings",
  "org_members_manage_own_venues",
  "verification-docs.insert.strict",
  "admin_user_roles.select.self_or_permitted",
  "venue-images.insert.venue-owner",
  "venue-images.update.venue-owner",
  "venue-images.delete.venue-owner",
]) {
  if (!allSql.includes(`POLICY "${name}"`)) {
    errors.push(`required RLS policy missing: ${name}`);
  }
}

const venueStorageMigration =
  migrations.find(({ number }) => number === 71)?.source ?? "";
for (const token of [
  "v.id::text = (storage.foldername(name))[2]",
  "v.organization_id::text = (storage.foldername(name))[1]",
  "public.is_org_member(v.organization_id)",
]) {
  if (!venueStorageMigration.includes(token)) {
    errors.push(`venue-media ownership contract missing: ${token}`);
  }
}

if (
  /\bGRANT\s+(?:ALL|EXECUTE)[\s\S]{0,300}?\s+TO\s+PUBLIC\b/i.test(activeSql)
) {
  errors.push("unsafe active GRANT to PUBLIC detected");
}

for (const warning of [...new Set(warnings)]) console.warn(`WARN: ${warning}`);
if (errors.length > 0) {
  console.error(`Database contract validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Database contracts valid: ${migrationFiles.length} migrations; ` +
    "required functions, triggers, policies, grants, and migration 070 types present.",
);
