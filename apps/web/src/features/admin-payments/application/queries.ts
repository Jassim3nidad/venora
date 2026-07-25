import type { SupabaseClient } from "@supabase/supabase-js";

export const PAYMENTS_PAGE_SIZE = 25;

export type TransactionStatusFilter =
  | "all"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "cancelled";

export type ProviderFilter = "all" | "paymongo" | "maya" | "stripe";

export type RefundStatusFilter =
  | "all"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export type WebhookStatusFilter =
  | "all"
  | "processing"
  | "processed"
  | "failed"
  | "skipped";

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type AdminTransactionRow = {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paymentKind: string;
  providerReference: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  venueName: string;
};

export type AdminRefundRow = {
  id: string;
  bookingId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  paymentProvider: string;
  providerReference: string | null;
  reason: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
  venueName: string;
};

export type AdminWebhookRow = {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  status: string;
  error: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export type AdminPaymentsKpis = {
  paidVolume: number;
  pendingCount: number;
  failedCount: number;
  refundPendingCount: number;
  webhookFailedCount: number;
};

export async function getAdminPaymentsWorkspace(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any> | any,
  options: {
    transactionStatus?: TransactionStatusFilter;
    provider?: ProviderFilter;
    refundStatus?: RefundStatusFilter;
  } = {},
) {
  const transactionStatus = options.transactionStatus ?? "all";
  const provider = options.provider ?? "all";
  const refundStatus = options.refundStatus ?? "all";

  let transactionsQuery = supabase
    .from("transactions")
    .select(
      `
        id,
        booking_id,
        amount,
        currency,
        status,
        payment_provider,
        payment_kind,
        provider_reference,
        failure_reason,
        paid_at,
        created_at,
        bookings (
          id,
          venues (name)
        )
      `,
    )
    .order("created_at", { ascending: false })
    .limit(PAYMENTS_PAGE_SIZE);

  if (transactionStatus !== "all") {
    transactionsQuery = transactionsQuery.eq("status", transactionStatus);
  }
  if (provider !== "all") {
    transactionsQuery = transactionsQuery.eq("payment_provider", provider);
  }

  let refundsQuery = supabase
    .from("refunds")
    .select(
      `
        id,
        booking_id,
        transaction_id,
        amount,
        currency,
        status,
        payment_provider,
        provider_reference,
        reason,
        failure_reason,
        created_at,
        processed_at,
        bookings (
          id,
          venues (name)
        )
      `,
    )
    .order("created_at", { ascending: false })
    .limit(PAYMENTS_PAGE_SIZE);

  if (refundStatus !== "all") {
    refundsQuery = refundsQuery.eq("status", refundStatus);
  }

  const [
    transactionsResult,
    refundsResult,
    webhooksResult,
    paidVolumeResult,
    pendingCountResult,
    failedCountResult,
    refundPendingResult,
    webhookFailedResult,
  ] = await Promise.all([
    transactionsQuery,
    refundsQuery,
    supabase
      .from("payment_webhook_events")
      .select(
        "id, provider, event_id, event_type, status, error, received_at, processed_at",
      )
      .in("status", ["failed", "processing"])
      .order("received_at", { ascending: false })
      .limit(20),
    supabase.from("transactions").select("amount").eq("status", "paid"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("refunds")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"]),
    supabase
      .from("payment_webhook_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  const transactions: AdminTransactionRow[] = (
    transactionsResult.data ?? []
  ).map((row: any) => {
    const booking = asOne(row.bookings);
    const venue = asOne(booking?.venues);
    return {
      id: row.id,
      bookingId: row.booking_id,
      amount: Number(row.amount) || 0,
      currency: row.currency ?? "PHP",
      status: row.status,
      paymentProvider: row.payment_provider,
      paymentKind: row.payment_kind ?? "deposit",
      providerReference: row.provider_reference,
      failureReason: row.failure_reason,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      venueName: venue?.name ?? "Unknown venue",
    };
  });

  const refunds: AdminRefundRow[] = (refundsResult.data ?? []).map(
    (row: any) => {
      const booking = asOne(row.bookings);
      const venue = asOne(booking?.venues);
      return {
        id: row.id,
        bookingId: row.booking_id,
        transactionId: row.transaction_id,
        amount: Number(row.amount) || 0,
        currency: row.currency ?? "PHP",
        status: row.status,
        paymentProvider: row.payment_provider,
        providerReference: row.provider_reference,
        reason: row.reason,
        failureReason: row.failure_reason,
        createdAt: row.created_at,
        processedAt: row.processed_at,
        venueName: venue?.name ?? "Unknown venue",
      };
    },
  );

  const webhooks: AdminWebhookRow[] = (webhooksResult.data ?? []).map(
    (row: any) => ({
      id: row.id,
      provider: row.provider,
      eventId: row.event_id,
      eventType: row.event_type,
      status: row.status,
      error: row.error,
      receivedAt: row.received_at,
      processedAt: row.processed_at,
    }),
  );

  const paidVolume = (paidVolumeResult.data ?? []).reduce(
    (sum: number, row: { amount: number | null }) =>
      sum + (Number(row.amount) || 0),
    0,
  );

  const kpis: AdminPaymentsKpis = {
    paidVolume,
    pendingCount: pendingCountResult.count ?? 0,
    failedCount: failedCountResult.count ?? 0,
    refundPendingCount: refundPendingResult.count ?? 0,
    webhookFailedCount: webhookFailedResult.count ?? 0,
  };

  return {
    transactions,
    refunds,
    webhooks,
    kpis,
    errors: {
      transactions: transactionsResult.error?.message ?? null,
      refunds: refundsResult.error?.message ?? null,
      webhooks: webhooksResult.error?.message ?? null,
    },
  };
}
