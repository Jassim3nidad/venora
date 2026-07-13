// Integration test for public.resolve_commission() (migration 059).
// Exercises global / category / venue-specific / promotional / expired /
// conflicting / missing rule resolution against the real hosted database
// via the service-role key. Every row this script inserts is deleted in a
// `finally` block, including on failure — it never leaves test data behind
// and never touches any table other than commission_rules (read-only
// queries are used to find a venue/category pairing safe to test against).
//
// Run with: node scripts/validate-commission-resolution.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "apps/web/.env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

let failed = false;
const insertedRuleIds = [];

async function check(label, fn) {
  try {
    await fn();
    console.log(`PASS  ${label}`);
  } catch (e) {
    failed = true;
    console.log(`FAIL  ${label}:`, e.message ?? e);
  }
}

async function insertRule(rule) {
  const { data, error } = await supabase.from("commission_rules").insert(rule).select().single();
  if (error) throw new Error(`could not insert test rule: ${error.message}`);
  insertedRuleIds.push(data.id);
  return data;
}

async function resolve(venueId, amount) {
  const { data, error } = await supabase.rpc("resolve_commission", { p_venue_id: venueId, p_amount: amount });
  if (error) throw new Error(`resolve_commission RPC failed: ${error.message}`);
  return data;
}

async function cleanup() {
  if (insertedRuleIds.length === 0) return;
  const { error } = await supabase.from("commission_rules").delete().in("id", insertedRuleIds);
  if (error) console.error("Cleanup warning: could not delete test rules:", error.message);
  else console.log(`Cleaned up ${insertedRuleIds.length} test commission_rules row(s).`);
}

async function main() {
  // Find a venue + assigned category with NO existing commission_rules
  // referencing either, so our test rows are the only ones in play and
  // results are deterministic regardless of real production config.
  const { data: existingRefs } = await supabase.from("commission_rules").select("reference_id");
  const usedIds = new Set((existingRefs ?? []).map((r) => r.reference_id).filter(Boolean));

  const { data: assignments, error: assignmentsError } = await supabase
    .from("venue_category_assignments")
    .select("venue_id, category_id")
    .limit(200);
  if (assignmentsError) throw new Error(`could not read venue_category_assignments: ${assignmentsError.message}`);

  const candidate = (assignments ?? []).find(
    (a) => !usedIds.has(a.venue_id) && !usedIds.has(a.category_id),
  );
  if (!candidate) {
    console.log("SKIP  No venue/category pairing free of existing commission_rules — cannot run isolated tests safely.");
    process.exit(0);
  }
  const { venue_id: venueId, category_id: categoryId } = candidate;
  console.log(`Using venue ${venueId} / category ${categoryId} (currently unreferenced by any commission_rules row).\n`);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const lastYear = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  await check("missing rule (zero amount) returns none/zero, not an error", async () => {
    const result = await resolve(venueId, 0);
    if (result.commission_type !== "none" || Number(result.commission_amount) !== 0) {
      throw new Error(`expected {type:none, amount:0}, got ${JSON.stringify(result)}`);
    }
  });

  await check("global rule applies when nothing more specific exists", async () => {
    // Relies on the seeded global rule from supabase/seed.sql (10%).
    const result = await resolve(venueId, 1000);
    if (result.commission_type === "none") throw new Error("expected the seeded global rule to apply, got none");
  });

  await check("category-specific rule overrides the global rule", async () => {
    await insertRule({
      scope: "category",
      reference_id: categoryId,
      label: "test: category rule",
      percentage: 12,
      effective_from: lastWeek,
      is_active: true,
    });
    const result = await resolve(venueId, 1000);
    if (Number(result.rate) !== 12) throw new Error(`expected category rate 12, got ${JSON.stringify(result)}`);
  });

  await check("venue-specific rule overrides the category rule", async () => {
    await insertRule({
      scope: "venue",
      reference_id: venueId,
      label: "test: venue-specific rule",
      percentage: 20,
      effective_from: lastWeek,
      is_active: true,
    });
    const result = await resolve(venueId, 1000);
    if (Number(result.rate) !== 20) throw new Error(`expected venue-specific rate 20, got ${JSON.stringify(result)}`);
  });

  await check("promotional rule (later effective_from, same scope) overrides the standard venue rule", async () => {
    await insertRule({
      scope: "venue",
      reference_id: venueId,
      label: "test: promo rule",
      percentage: 5,
      effective_from: yesterday,
      effective_to: nextYear,
      is_active: true,
    });
    const result = await resolve(venueId, 1000);
    if (Number(result.rate) !== 5) throw new Error(`expected promo rate 5 (most recent effective_from wins), got ${JSON.stringify(result)}`);
  });

  await check("expired rule is ignored, falls back to the next-best active rule", async () => {
    await insertRule({
      scope: "venue",
      reference_id: venueId,
      label: "test: expired rule",
      percentage: 99,
      effective_from: lastYear,
      effective_to: yesterday,
      is_active: true,
    });
    const result = await resolve(venueId, 1000);
    if (Number(result.rate) === 99) throw new Error("expired rule was incorrectly applied");
  });

  await check("conflicting rules (identical effective_from, same scope) resolve deterministically", async () => {
    const conflictDate = today;
    await insertRule({
      scope: "venue", reference_id: venueId, label: "test: conflict A",
      percentage: 7, effective_from: conflictDate, is_active: true,
    });
    await insertRule({
      scope: "venue", reference_id: venueId, label: "test: conflict B",
      percentage: 8, effective_from: conflictDate, is_active: true,
    });
    const first = await resolve(venueId, 1000);
    const second = await resolve(venueId, 1000);
    if (JSON.stringify(first) !== JSON.stringify(second)) {
      throw new Error(`resolution was non-deterministic across calls: ${JSON.stringify(first)} vs ${JSON.stringify(second)}`);
    }
  });

  await check("inactive rule is ignored even if otherwise the best match", async () => {
    await insertRule({
      scope: "venue", reference_id: venueId, label: "test: inactive override",
      percentage: 1, effective_from: today, is_active: false,
    });
    const result = await resolve(venueId, 1000);
    if (Number(result.rate) === 1) throw new Error("inactive rule was incorrectly applied");
  });

  await check("min/max commission clamping is applied", async () => {
    await insertRule({
      scope: "venue", reference_id: venueId, label: "test: clamp rule",
      percentage: 50, effective_from: today, is_active: true,
      max_commission_amount: 10,
    });
    const result = await resolve(venueId, 1000);
    if (Number(result.commission_amount) !== 10) {
      throw new Error(`expected commission clamped to 10, got ${result.commission_amount}`);
    }
  });
}

main()
  .catch((e) => {
    failed = true;
    console.error("Unexpected script error:", e);
  })
  .finally(async () => {
    await cleanup();
    console.log(failed ? "\nSome checks FAILED." : "\nAll checks PASSED.");
    process.exit(failed ? 1 : 0);
  });
