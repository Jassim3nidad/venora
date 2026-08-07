import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { createPayMongoTreasuryAdapter } from "@/features/payouts/infrastructure/paymongo/paymongo-treasury.adapter";
import { syncWithdrawalStatus } from "@/features/payouts/application/disbursement.service";

/**
 * POST /api/webhooks/paymongo-treasury
 *
 * Target of `callback_url` on a Treasury transfer.
 *
 * IMPORTANT — this endpoint does not trust its request body.
 *
 * PayMongo's Treasury documentation defines `callback_url` as notifying
 * "the progress of the transfer via HTTP call" but does not publish the
 * payload structure, event names, or a signature scheme for it. Rather
 * than reverse-engineer an undocumented shape and settle real money on a
 * guess, the body is used only to recover an identifier. Status is then
 * read from the documented GET /v2/transfers/{id}, which is authoritative
 * and authenticated with our own secret key.
 *
 * That inversion also removes the need to verify the callback signature:
 * an attacker who forges a call can, at worst, make us re-read our own
 * transfer from PayMongo and arrive at the correct answer.
 *
 * Correlation prefers `reference_number` — the withdrawal id we set
 * ourselves when creating the transfer — and falls back to matching a
 * provider transfer id against stored references.
 */

/** Pulls the first plausible identifier out of an unknown JSON shape. */
function collectCandidateIds(value: unknown, found: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("tr_") || /^[0-9a-f-]{36}$/i.test(value)) {
      found.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectCandidateIds(item, found);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectCandidateIds(item, found);
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    // Acknowledge malformed bodies: retries cannot fix a parse failure.
    console.error("[treasury-webhook] Unparseable callback body");
    return NextResponse.json({ received: true, result: "ignored" });
  }

  const candidates = new Set<string>();
  collectCandidateIds(parsed, candidates);

  if (candidates.size === 0) {
    console.error("[treasury-webhook] Callback carried no usable identifier");
    return NextResponse.json({ received: true, result: "ignored" });
  }

  const serviceClient = createServiceClient();
  const gateway = createPayMongoTreasuryAdapter();

  // Resolve candidates to withdrawals we actually know about. A UUID is
  // matched on id (our reference_number); anything else on the stored
  // provider_reference (the tr_... transfer id).
  const ids = [...candidates];
  const { data: matches } = await serviceClient
    .from("withdrawal_requests")
    .select("id")
    .or(
      [
        `id.in.(${ids.filter((v) => /^[0-9a-f-]{36}$/i.test(v)).join(",") || "00000000-0000-0000-0000-000000000000"})`,
        `provider_reference.in.(${ids.map((v) => `"${v}"`).join(",")})`,
      ].join(","),
    )
    .limit(10);

  const withdrawalIds = (matches ?? []).map((row: { id: string }) => row.id);

  if (withdrawalIds.length === 0) {
    console.error("[treasury-webhook] No withdrawal matched the callback");
    return NextResponse.json({ received: true, result: "unmatched" });
  }

  const results: string[] = [];
  for (const withdrawalId of withdrawalIds) {
    const outcome = await syncWithdrawalStatus(
      serviceClient,
      gateway,
      withdrawalId,
    );
    results.push(outcome.result);

    // needs_review means the outcome could not be determined from
    // verified provider data and the withdrawal has been parked for an
    // operator. A 200 is correct: retrying the callback cannot resolve it,
    // and the funds stay held either way.
    if (!outcome.ok && outcome.result === "needs_review") {
      console.error(
        `[treasury-webhook] Withdrawal ${withdrawalId} parked for review: ${outcome.error}`,
      );
    }
  }

  return NextResponse.json({ received: true, results });
}
