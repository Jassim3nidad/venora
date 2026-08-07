import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPayMongoTreasuryAdapter } from "@/features/payouts/infrastructure/paymongo/paymongo-treasury.adapter";
import type {
  ReceivingInstitution,
  TransferNetwork,
} from "@/features/payouts/domain/gateways/disbursement-gateway.port";

/**
 * GET /api/payout-institutions?network=instapay|pesonet
 *
 * Supplies the payout-account picker. Proxied rather than called from the
 * browser because the institution list requires the PayMongo secret key,
 * which must never reach the client.
 *
 * The list is large (hundreds of banks) and effectively static, so it is
 * memoised per network for the lifetime of the server instance.
 */

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<
  TransferNetwork,
  { at: number; institutions: ReceivingInstitution[] }
>();

function isNetwork(value: string | null): value is TransferNetwork {
  return value === "instapay" || value === "pesonet";
}

export async function GET(request: NextRequest) {
  // Signed-in only: this is an authenticated proxy for a credentialed
  // upstream, not a public directory.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const network = request.nextUrl.searchParams.get("network") ?? "instapay";
  if (!isNetwork(network)) {
    return NextResponse.json(
      { error: "network must be instapay or pesonet" },
      { status: 400 },
    );
  }

  const cached = cache.get(network);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ data: cached.institutions, cached: true });
  }

  try {
    const institutions = await createPayMongoTreasuryAdapter()
      .listReceivingInstitutions(network);

    cache.set(network, { at: Date.now(), institutions });
    return NextResponse.json({ data: institutions, cached: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load institutions";
    console.error("[payout-institutions]", message);

    // Serve a stale list rather than block someone from adding an account
    // because the upstream is briefly unavailable.
    if (cached) {
      return NextResponse.json({ data: cached.institutions, stale: true });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
