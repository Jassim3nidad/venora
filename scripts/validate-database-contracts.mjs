import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationsRoot = join(root, "supabase", "migrations");
const typeFile = join(root, "packages", "database", "types", "generated.ts");
const errors = [];
const warnings = [];

const migrationFiles = readdirSync(migrationsRoot)
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();
const migrations = migrationFiles.map((name) => ({
  name,
  version: name.match(/^(\d+)_/)?.[1] ?? "",
  number: Number(name.match(/^(\d+)_/)?.[1]),
  source: readFileSync(join(migrationsRoot, name), "utf8"),
}));
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
  if (
    version === "068" &&
    names.join(",") ===
      "068_customer_supplier_inquiry_tracking.sql,068_enforce_booking_availability_integrity.sql"
  ) {
    warnings.push(
      `known duplicate migration 068 detected: ${names.join(", ")}`,
    );
  } else {
    errors.push(`duplicate migration ${version}: ${names.join(", ")}`);
  }
}

for (let index = 1; index < migrations.length; index += 1) {
  const previous = migrations[index - 1];
  const current = migrations[index];
  if (current.number >= previous.number) continue;
  if (previous.number === 45 && current.number === 5) {
    warnings.push(
      "legacy padded migrations 0040/0045 sort before 005; renaming requires hosted-history review",
    );
  } else {
    errors.push(
      `out-of-order migration filenames: ${previous.name} before ${current.name}`,
    );
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

const generatedTypes = readFileSync(typeFile, "utf8");
const portfolioTypes = generatedTypes.match(
  /supplier_portfolio_items:\s*\{[\s\S]*?\n\s{6}\};/,
)?.[0];
if (!portfolioTypes) {
  errors.push("generated supplier_portfolio_items type missing");
} else {
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
