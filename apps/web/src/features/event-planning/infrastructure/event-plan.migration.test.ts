import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

function findRepoRoot(start: string): string {
  let current = start;

  while (current !== dirname(current)) {
    if (existsSync(join(current, "supabase", "migrations"))) {
      return current;
    }

    current = dirname(current);
  }

  throw new Error("Could not find repository root");
}

function readEventPlansMigration(): string {
  const repoRoot = findRepoRoot(process.cwd());
  const migrationDir = join(repoRoot, "supabase", "migrations");
  const migrationName = readdirSync(migrationDir).find((name) =>
    /^\d+_create_event_plans\.sql$/.test(name),
  );

  if (!migrationName) {
    throw new Error("Missing create_event_plans migration");
  }

  return readFileSync(join(migrationDir, migrationName), "utf8")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

describe("event plans migration", () => {
  it("creates the event_plans table with customer-owned planning fields", () => {
    const sql = readEventPlansMigration();

    expect(sql).toContain("create table public.event_plans");
    expect(sql).toContain("customer_id uuid not null references public.profiles(id)");
    expect(sql).toContain("event_type_id uuid references public.event_types(id)");
    expect(sql).toContain("status text not null default 'draft'");
    expect(sql).toContain("title text");
    expect(sql).toContain("event_name text");
    expect(sql).toContain("date_preference_type text");
    expect(sql).toContain("province text");
    expect(sql).toContain("city text");
    expect(sql).toContain("nearby_locations_allowed boolean");
    expect(sql).toContain("guest_count_range text");
    expect(sql).toContain("budget_min numeric(12,2)");
    expect(sql).toContain("budget_max numeric(12,2)");
    expect(sql).toContain("setting_preference text");
    expect(sql).toContain("additional_requirements text");
    expect(sql).toContain("custom_service text");
    expect(sql).toContain("source_draft_fingerprint text");
  });

  it("keeps planner values constrained to supported statuses and option sets", () => {
    const sql = readEventPlansMigration();

    expect(sql).toContain("event_plans_status_check");
    expect(sql).toContain("'draft'");
    expect(sql).toContain("'completed'");
    expect(sql).toContain("'converted_to_inquiry'");
    expect(sql).toContain("'converted_to_booking'");
    expect(sql).toContain("'archived'");
    expect(sql).toContain("event_plans_date_preference_type_check");
    expect(sql).toContain("'exact'");
    expect(sql).toContain("'month'");
    expect(sql).toContain("'flexible'");
    expect(sql).toContain("'not-sure'");
    expect(sql).toContain("'range'");
    expect(sql).toContain("event_plans_ranked_priorities_check");
    expect(sql).toContain("cardinality(ranked_priorities) <= 3");
    expect(sql).toContain("event_plans_budget_range_check");
    expect(sql).toContain("event_plans_guest_range_check");
    expect(sql).toContain("event_plans_service_selection_mode_check");
    expect(sql).toContain("'needs-services'");
    expect(sql).toContain("'already-complete'");
  });

  it("adds indexes for customer dashboard and future recommendation lookups", () => {
    const sql = readEventPlansMigration();

    expect(sql).toContain("create index idx_event_plans_customer");
    expect(sql).toContain("create index idx_event_plans_customer_status");
    expect(sql).toContain("create index idx_event_plans_event_type");
    expect(sql).toContain("create index idx_event_plans_location");
    expect(sql).toContain("create index idx_event_plans_exact_date");
    expect(sql).toContain("create unique index idx_event_plans_customer_fingerprint");
  });

  it("enables authenticated-only owner RLS without public access", () => {
    const sql = readEventPlansMigration();

    expect(sql).toContain("alter table public.event_plans enable row level security");
    expect(sql).toContain("revoke all on table public.event_plans from public");
    expect(sql).toContain("revoke all on table public.event_plans from anon");
    expect(sql).toContain("grant select, insert, update on table public.event_plans to authenticated");
    expect(sql).toContain("for select to authenticated using ((select auth.uid()) = customer_id)");
    expect(sql).toContain("for insert to authenticated with check ((select auth.uid()) = customer_id)");
    expect(sql).toContain(
      "for update to authenticated using ((select auth.uid()) = customer_id) with check ((select auth.uid()) = customer_id)",
    );
    expect(sql).not.toContain("grant select on table public.event_plans to anon");
    expect(sql).not.toContain("auth.role()");
  });
});
