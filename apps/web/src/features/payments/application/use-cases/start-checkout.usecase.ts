import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError, PaymentError } from "@/lib/errors";
import { getGateway } from "../gateway-registry";
import { toMinorUnits } from "../../domain/value-objects/money.vo";
import type { PaymentProviderId, TransactionRow } from "../../types/payment.types";

export interface StartCheckoutInput {
  bookingId: string;
  provider: PaymentProviderId;
  appUrl: string;
  customerEmail?: string | null;
}

export interface StartCheckoutResult {
  bookingId: string;
  transactionId: string;
  amount: number;
  provider: PaymentProviderId;
  checkoutUrl: string;
  status: string;
}

/**
 * How long we trust a previously-created checkout session before
 * forcing a fresh one. PayMongo does not publish a fixed hosted
 * checkout session TTL, so this is a conservative safety net (not a
 * documented provider guarantee) against reusing a session that may no
 * longer be payable.
 */
const CHECKOUT_SESSION_TTL_MS = 55 * 60 * 1000;

/**
 * Starts (or resumes) the deposit checkout for a booking.
 *
 * 1. `start_booking_payment` RPC creates/reuses the pending transaction and
 *    moves the booking to `payment_pending` (customer-scoped, RLS-enforced).
 *    A row lock on the booking there prevents two concurrent calls from
 *    ever creating two pending transactions for the same booking.
 * 2. If the transaction already has a live, non-stale provider session,
 *    reuse it.
 * 3. Otherwise create a hosted checkout session with the provider and
 *    persist its reference + URL via `attach_payment_session`, which is
 *    first-attach-wins: if a concurrent request already attached a
 *    session, the DB's canonical row (not the one just created here) is
 *    what gets returned, so two racing requests converge on one session
 *    instead of one silently clobbering the other's reference.
 *
 * `serviceClient` is required because `attach_payment_session` is
 * service-role only: provider_reference feeds webhook correlation and
 * must never be settable from a client-held session.
 */
export async function startCheckout(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  input: StartCheckoutInput,
): Promise<StartCheckoutResult> {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    if (!input.appUrl) {
      throw new PaymentError("INVALID_APP_URL", "Production application URL is missing.");
    }
    if (!input.appUrl.startsWith("https://")) {
      throw new PaymentError("INVALID_APP_URL", "Production application URL must use HTTPS.");
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(input.appUrl);
    } catch {
      throw new PaymentError("INVALID_APP_URL", "Production application URL is incorrectly formatted.");
    }
    if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
      throw new PaymentError("INVALID_APP_URL", "Production application URL cannot be localhost.");
    }
  }

  const gateway = getGateway(input.provider);

  const { data: transaction, error: startError } = (await supabase.rpc(
    "start_booking_payment",
    {
      p_booking_id: input.bookingId,
      p_payment_provider: input.provider,
      p_checkout_url: null,
      p_provider_reference: null,
    },
  )) as { data: TransactionRow | null; error: { message: string } | null };

  if (startError || !transaction) {
    throw new PaymentError(
      "PAYMENT_START_FAILED",
      startError?.message ?? "Unable to start payment for this booking.",
    );
  }

  // Resume an existing provider session (idempotent retry / page refresh),
  // but only if it was created for the same provider and isn't stale.
  const sessionAgeMs = Date.now() - new Date(transaction.created_at).getTime();
  if (
    transaction.checkout_url &&
    transaction.provider_reference &&
    transaction.payment_provider === input.provider &&
    sessionAgeMs < CHECKOUT_SESSION_TTL_MS
  ) {
    return {
      bookingId: input.bookingId,
      transactionId: transaction.id,
      amount: Number(transaction.amount),
      provider: transaction.payment_provider,
      checkoutUrl: transaction.checkout_url,
      status: transaction.status,
    };
  }

  const isReplacingStaleSession = Boolean(transaction.checkout_url) && sessionAgeMs >= CHECKOUT_SESSION_TTL_MS;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, event_date, venues ( name )")
    .eq("id", input.bookingId)
    .single<{ id: string; event_date: string; venues: { name: string } | null }>();

  if (!booking) throw new NotFoundError("Booking");

  const session = await gateway.createCheckoutSession({
    bookingId: input.bookingId,
    transactionId: transaction.id,
    amountMinor: toMinorUnits(Number(transaction.amount)),
    currency: transaction.currency ?? "PHP",
    description: `Reservation deposit — ${booking.venues?.name ?? "venue booking"} (${booking.event_date})`,
    customerEmail: input.customerEmail ?? null,
    successUrl: `${input.appUrl}/bookings/${input.bookingId}/confirmation`,
    cancelUrl: `${input.appUrl}/bookings/${input.bookingId}/payment`,
    metadata: {
      booking_id: input.bookingId,
      transaction_id: transaction.id,
    },
  });

  const { data: attached, error: attachError } = (await serviceClient.rpc(
    "attach_payment_session",
    {
      p_transaction_id: transaction.id,
      p_provider_reference: session.sessionReference,
      p_checkout_url: session.checkoutUrl,
      p_metadata: { checkout_session_reference: session.sessionReference },
      p_force: isReplacingStaleSession,
    },
  )) as { data: TransactionRow | null; error: { message: string } | null };

  if (attachError || !attached || !attached.checkout_url) {
    throw new PaymentError(
      "PAYMENT_SESSION_ATTACH_FAILED",
      attachError?.message ?? "Unable to save the payment session.",
    );
  }

  // Use the DB's canonical session, not the one just created here: if a
  // concurrent request won the first-attach race, `attached` reflects
  // ITS session, and this (redundant) one we just created with the
  // provider is simply left unused.
  return {
    bookingId: input.bookingId,
    transactionId: attached.id,
    amount: Number(attached.amount),
    provider: attached.payment_provider,
    checkoutUrl: attached.checkout_url,
    status: attached.status,
  };
}
