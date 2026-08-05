/**
 * Display-side mirrors of the database tunables.
 *
 * The authoritative values live in payout_hold_period() and
 * minimum_withdrawal_amount() — request_withdrawal() enforces those, and
 * these constants only shape copy and client-side validation. Keep them in
 * step with the SQL functions when either changes.
 */

export const PAYOUT_HOLD_DAYS = 7;
export const MINIMUM_WITHDRAWAL = 500;
