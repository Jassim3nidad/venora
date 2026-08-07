import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { createPayMongoTreasuryAdapter } from "@/features/payouts/infrastructure/paymongo/paymongo-treasury.adapter";
import { reconcileStuckWithdrawals } from "@/features/payouts/application/disbursement.service";

/**
 * POST /api/payouts/reconcile
 *
 * Sweeps withdrawals stuck in `processing` and resolves them against the
 * provider's authoritative status.
 *
 * This closes the loop opened by the rule that ambiguous provider failures
 * (timeout, unreachable, 5xx) must never release funds: those withdrawals
 * stay in `processing` with no transfer id, and only this sweep can ask
 * PayMongo whether a transfer actually exists and settle the question.
 *
 * Intended for a scheduled caller. Authenticated with a shared secret
 * compared in constant time — there is no user session behind a cron job.
 */

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.PAYOUT_RECONCILE_SECRET;
  if (!expected) return false;

  const provided =
    request.headers.get("x-reconcile-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length is compared first because timingSafeEqual throws on a mismatch;
  // the length itself is not the secret.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    // No detail: an unauthenticated caller learns nothing about whether
    // the secret is unset or merely wrong.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gateway = createPayMongoTreasuryAdapter();

  // Without credentials every lookup would fail and each withdrawal would
  // be counted as unresolved, which reads like a provider outage.
  if (!gateway.isConfigured()) {
    return NextResponse.json(
      { error: "Payout provider is not configured", skipped: true },
      { status: 503 },
    );
  }

  try {
    const tally = await reconcileStuckWithdrawals(
      createServiceClient(),
      gateway,
    );
    console.log("[payouts] Reconciliation sweep", tally);
    return NextResponse.json(tally);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reconciliation failed";
    console.error("[payouts] Reconciliation sweep failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
