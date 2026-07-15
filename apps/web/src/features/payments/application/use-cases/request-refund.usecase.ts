import type { SupabaseClient } from "@supabase/supabase-js";
import { PaymentError, RefundError } from "@/lib/errors";
import { getGateway } from "../gateway-registry";
import { toMinorUnits } from "../../domain/value-objects/money.vo";
import type { RefundRow } from "../../types/payment.types";

export interface RequestRefundInput {
  bookingId: string;
  reason?: string | null;
}

export interface RequestRefundResult {
  refundId: string;
  bookingId: string;
  amount: number;
  status: string;
}

/**
 * Requests a refund for a cancelled, paid booking.
 *
 * 1. `request_booking_refund` (user client) validates permissions +
 *    booking state and creates the `pending` refund row.
 * 2. The provider refund is created via the gateway using the captured
 *    payment reference stored on the transaction.
 * 3. `mark_refund_processing` (service client) records the provider
 *    refund reference; the webhook finalizes success/failure. If the
 *    provider settles synchronously we finalize immediately.
 */
export async function requestRefund(
  userClient: SupabaseClient,
  serviceClient: SupabaseClient,
  input: RequestRefundInput,
): Promise<RequestRefundResult> {
  const { data: refund, error: requestError } = (await userClient.rpc(
    "request_booking_refund",
    {
      p_booking_id: input.bookingId,
      p_reason: input.reason ?? null,
    },
  )) as { data: RefundRow | null; error: { message: string } | null };

  if (requestError || !refund) {
    throw new PaymentError(
      "REFUND_REQUEST_FAILED",
      requestError?.message ?? "Unable to request a refund for this booking.",
    );
  }

  const gateway = getGateway(refund.payment_provider);

  const paymentReference =
    (refund.metadata?.["payment_provider_reference"] as string | undefined) ??
    null;

  if (!paymentReference) {
    // No provider payment to refund against — leave the refund pending
    // for manual admin settlement rather than failing the request.
    return {
      refundId: refund.id,
      bookingId: refund.booking_id,
      amount: Number(refund.amount),
      status: refund.status,
    };
  }

  let providerRefund;
  try {
    providerRefund = await gateway.createRefund({
      paymentReference,
      amountMinor: toMinorUnits(Number(refund.amount)),
      reason: "requested_by_customer",
      metadata: { booking_id: refund.booking_id, refund_id: refund.id },
    });
  } catch (error) {
    console.error("[payments] Provider refund creation failed:", error);
    throw new RefundError();
  }

  const { error: markError } = await serviceClient.rpc(
    "mark_refund_processing",
    {
      p_refund_id: refund.id,
      p_provider_reference: providerRefund.refundReference,
    },
  );

  if (markError) {
    // The provider refund exists but we could not record it — surface
    // loudly; reconciliation happens via the webhook + audit trail.
    console.error(
      "[payments] mark_refund_processing failed:",
      markError.message,
    );
  }

  let finalStatus = "processing";

  if (providerRefund.status === "succeeded") {
    const { error: completeError } = await serviceClient.rpc(
      "complete_booking_refund",
      {
        p_payment_provider: refund.payment_provider,
        p_provider_reference: providerRefund.refundReference,
        p_amount: Number(refund.amount),
      },
    );
    if (!completeError) finalStatus = "succeeded";
  }

  return {
    refundId: refund.id,
    bookingId: refund.booking_id,
    amount: Number(refund.amount),
    status: finalStatus,
  };
}
