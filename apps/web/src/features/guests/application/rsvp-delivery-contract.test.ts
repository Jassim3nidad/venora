import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../../../../..");
const migration = readFileSync(
  resolve(
    repositoryRoot,
    "supabase/migrations/20260728140000_rsvp_delivery_tracking.sql",
  ),
  "utf8",
);
const edgeFunction = readFileSync(
  resolve(repositoryRoot, "supabase/functions/rsvp-notifications/index.ts"),
  "utf8",
);
const workflow = readFileSync(
  resolve(repositoryRoot, ".github/workflows/rsvp-reminders.yml"),
  "utf8",
);

describe("RSVP delivery contract", () => {
  it("tracks invitation and reminder outcomes", () => {
    expect(migration).toContain("rsvp_invitation_delivered_at");
    expect(migration).toContain("rsvp_reminder_sent_at");
    expect(migration).toContain("rsvp_delivery_error");
    expect(migration).toContain("event_guests_pending_rsvp_reminders_idx");
  });

  it("authorizes owner delivery through RLS and reminder batches by secret", () => {
    expect(edgeFunction).toContain('mode === "invitation"');
    expect(edgeFunction).toContain("Authorization: authorization");
    expect(edgeFunction).toContain('mode === "reminders"');
    expect(edgeFunction).toContain("constantTimeEqual");
    expect(edgeFunction).toContain("RSVP_REMINDER_SECRET");
    expect(edgeFunction).toContain("claimReminder");
    expect(edgeFunction).toContain('.is("rsvp_reminder_sent_at", null)');
  });

  it("schedules bounded reminder batches without embedding credentials", () => {
    expect(workflow).toContain('cron: "17 */6 * * *"');
    expect(workflow).toContain("RSVP_REMINDER_FUNCTION_URL");
    expect(workflow).toContain("RSVP_REMINDER_ANON_KEY");
    expect(workflow).toContain("RSVP_REMINDER_SECRET");
    expect(workflow).toContain('"limit":100');
  });
});
