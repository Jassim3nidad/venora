import type { WithdrawalStatus } from "../types/payout.types";

/**
 * Which withdrawal states count as "open" — i.e. block the recipient from
 * starting another one.
 *
 * This mirrors the guard inside `request_withdrawal()`. The database is
 * authoritative: it refuses a second request regardless of what the client
 * believes. This exists so the UI can explain the block before the user
 * submits, and so the rule is stated in exactly one place on this side.
 *
 * `needs_review` is open. A withdrawal under review still holds its
 * claimed payouts and its real outcome is unknown — it may already have
 * been paid — so it is the worst possible moment to send more money.
 */
export const OPEN_WITHDRAWAL_STATUSES: readonly WithdrawalStatus[] = [
  "pending",
  "approved",
  "processing",
  "needs_review",
] as const;

/**
 * Terminal states. A recipient with only these may start a new withdrawal.
 * Listed explicitly rather than derived, so adding a status to the enum
 * forces a deliberate decision about which side it belongs on.
 */
export const TERMINAL_WITHDRAWAL_STATUSES: readonly WithdrawalStatus[] = [
  "paid",
  "failed",
  "rejected",
  "cancelled",
] as const;

export function isOpenWithdrawalStatus(status: WithdrawalStatus): boolean {
  return OPEN_WITHDRAWAL_STATUSES.includes(status);
}

/** True when any of the recipient's withdrawals blocks a new request. */
export function hasOpenWithdrawal(
  withdrawals: ReadonlyArray<{ status: WithdrawalStatus }>,
): boolean {
  return withdrawals.some((withdrawal) =>
    isOpenWithdrawalStatus(withdrawal.status),
  );
}

/**
 * Why the recipient is blocked, for a message that matches reality.
 * A withdrawal under review is not simply "in progress".
 */
export function openWithdrawalReason(
  withdrawals: ReadonlyArray<{ status: WithdrawalStatus }>,
): "under_review" | "in_progress" | null {
  if (withdrawals.some((w) => w.status === "needs_review")) {
    return "under_review";
  }
  return hasOpenWithdrawal(withdrawals) ? "in_progress" : null;
}
