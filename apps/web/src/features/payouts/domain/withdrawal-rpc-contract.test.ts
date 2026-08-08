import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Contract tests over the withdrawal SQL.
 *
 * The database — not the client — is authoritative for the one-open-
 * withdrawal rule and for every fund movement. There is no live Postgres
 * in this suite, so these assert the guarantees are present in the
 * migration that ships. They are deliberately about *safety properties*,
 * not formatting: each one corresponds to a way money could be lost.
 */

const MIGRATIONS = path.join(
  process.cwd(),
  "..",
  "..",
  "supabase",
  "migrations",
);

const read = (file: string) =>
  fs.readFileSync(path.join(MIGRATIONS, file), "utf8");

const openRule = read("20260807160000_needs_review_is_open.sql");
const reviewState = read("20260807140000_withdrawal_needs_review.sql");

describe("request_withdrawal — one open withdrawal per recipient", () => {
  it("counts needs_review as open", () => {
    expect(openRule).toContain(
      "WHERE w.status IN ('pending', 'approved', 'processing', 'needs_review')",
    );
  });

  it("no longer uses the narrower three-status guard", () => {
    expect(openRule).not.toContain(
      "WHERE w.status IN ('pending', 'approved', 'processing')\n",
    );
  });

  it("explains the block differently when a review is the cause", () => {
    expect(openRule).toContain("under review while we confirm its outcome");
  });

  it("still claims payouts under row locks", () => {
    // Removing FOR UPDATE would let two concurrent requests claim the
    // same payout rows.
    expect(openRule).toContain("FOR UPDATE");
  });
});

describe("flag_withdrawal_for_review — funds must stay held", () => {
  it("does not release payouts", () => {
    const fn = reviewState.slice(
      reviewState.indexOf("FUNCTION public.flag_withdrawal_for_review"),
      reviewState.indexOf("resolve_withdrawal_review"),
    );
    expect(fn).not.toContain("release_withdrawal_payouts");
  });

  it("never overrides a state reached from verified data", () => {
    expect(reviewState).toContain(
      "IF v_request.status IN ('paid', 'failed', 'rejected', 'cancelled') THEN",
    );
  });
});

describe("resolve_withdrawal_review — guarded manual resolution", () => {
  const fn = openRule.slice(
    openRule.indexOf("FUNCTION public.resolve_withdrawal_review"),
  );

  it("requires an administrator", () => {
    expect(fn).toContain("IF NOT public.is_admin() THEN");
  });

  it("accepts only the two terminal outcomes", () => {
    expect(fn).toContain("IF p_outcome NOT IN ('paid', 'failed') THEN");
  });

  it("requires evidence of how the outcome was verified", () => {
    expect(fn).toContain("A note recording how the outcome was verified");
  });

  it("only resolves a withdrawal actually under review", () => {
    expect(fn).toContain(
      "WHERE id = p_withdrawal_id AND status = 'needs_review'",
    );
  });

  it("locks the row before transitioning it", () => {
    expect(fn).toContain("FOR UPDATE");
  });

  it("releases funds only on an explicit failed outcome", () => {
    // paid settles the payouts; failed releases them. Any other path must
    // not reach release_withdrawal_payouts.
    expect(fn).toContain("IF p_outcome = 'paid' THEN");
    expect(fn).toContain("PERFORM public.release_withdrawal_payouts");
    const release = fn.indexOf("release_withdrawal_payouts");
    const elseBranch = fn.indexOf("ELSE", fn.indexOf("IF p_outcome = 'paid'"));
    expect(elseBranch).toBeGreaterThan(-1);
    expect(release).toBeGreaterThan(elseBranch);
  });

  it("records the full transition in the audit log", () => {
    for (const field of [
      "'withdrawal.review_resolved'",
      "'previous_status'",
      "'new_status'",
      "'note'",
    ]) {
      expect(fn).toContain(field);
    }
  });

  it("does not log the destination account number", () => {
    const audit = fn.slice(fn.indexOf("log_audit"));
    expect(audit).not.toContain("account_number");
    expect(audit).not.toContain("ciphertext");
  });
});
