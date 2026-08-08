import { describe, expect, it } from "vitest";
import {
  OPEN_WITHDRAWAL_STATUSES,
  TERMINAL_WITHDRAWAL_STATUSES,
  hasOpenWithdrawal,
  isOpenWithdrawalStatus,
  openWithdrawalReason,
} from "./withdrawal-status";
import type { WithdrawalStatus } from "../types/payout.types";

const ALL: WithdrawalStatus[] = [
  "pending",
  "approved",
  "processing",
  "paid",
  "failed",
  "needs_review",
  "rejected",
  "cancelled",
];

describe("open withdrawal statuses", () => {
  it.each(["pending", "approved", "processing", "needs_review"] as const)(
    "%s blocks a new withdrawal",
    (status) => {
      expect(isOpenWithdrawalStatus(status)).toBe(true);
    },
  );

  it.each(["paid", "failed", "rejected", "cancelled"] as const)(
    "%s allows a new withdrawal",
    (status) => {
      expect(isOpenWithdrawalStatus(status)).toBe(false);
    },
  );

  it("classifies every status exactly once", () => {
    // Guards against a new enum value silently defaulting to "not open",
    // which would let a recipient withdraw again during an unknown state.
    for (const status of ALL) {
      const open = OPEN_WITHDRAWAL_STATUSES.includes(status);
      const terminal = TERMINAL_WITHDRAWAL_STATUSES.includes(status);
      expect(
        open !== terminal,
        `${status} must be exactly one of open/terminal`,
      ).toBe(true);
    }
    expect(
      OPEN_WITHDRAWAL_STATUSES.length + TERMINAL_WITHDRAWAL_STATUSES.length,
    ).toBe(ALL.length);
  });
});

describe("hasOpenWithdrawal", () => {
  it("blocks when a withdrawal is under review", () => {
    expect(hasOpenWithdrawal([{ status: "needs_review" }])).toBe(true);
  });

  it("blocks when any one of several is open", () => {
    expect(
      hasOpenWithdrawal([
        { status: "paid" },
        { status: "failed" },
        { status: "processing" },
      ]),
    ).toBe(true);
  });

  it("allows when every withdrawal is terminal", () => {
    expect(
      hasOpenWithdrawal([
        { status: "paid" },
        { status: "failed" },
        { status: "rejected" },
        { status: "cancelled" },
      ]),
    ).toBe(false);
  });

  it("allows a first-time recipient", () => {
    expect(hasOpenWithdrawal([])).toBe(false);
  });
});

describe("openWithdrawalReason", () => {
  it("reports review ahead of in-progress, so the message is accurate", () => {
    expect(
      openWithdrawalReason([
        { status: "processing" },
        { status: "needs_review" },
      ]),
    ).toBe("under_review");
  });

  it("reports in_progress for an ordinary open withdrawal", () => {
    expect(openWithdrawalReason([{ status: "approved" }])).toBe("in_progress");
  });

  it("reports nothing when unblocked", () => {
    expect(openWithdrawalReason([{ status: "paid" }])).toBeNull();
  });
});
