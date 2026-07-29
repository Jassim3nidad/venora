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
  "all" | "pending" | "processing" | "succeeded" | "failed" | "cancelled";

export type WebhookStatusFilter =
  "all" | "processing" | "processed" | "failed" | "skipped";

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

export type AdminPaymentAlertRow = {
  id: string;
  transactionId: string | null;
  bookingId: string | null;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  detectedAt: string;
};

export type AdminPaymentReconciliationRow = {
  id: string;
  transactionId: string;
  bookingId: string;
  status: string;
  severity: string;
  summary: string;
  details: string | null;
  providerReference: string | null;
  providerAmount: number | null;
  venoraAmount: number;
  providerCurrency: string | null;
  venoraCurrency: string;
  providerStatus: string | null;
  venoraStatus: string;
  reviewedAt: string | null;
  createdAt: string;
};

export type AdminPaymentsKpis = {
  paidVolume: number;
  pendingCount: number;
  failedCount: number;
  refundPendingCount: number;
  webhookFailedCount: number;
  openAlertCount: number;
  criticalAlertCount: number;
};

export type AdminPaymentDetail = {
  transaction: AdminTransactionRow & {
    commissionAmount: number;
    checkoutUrl: string | null;
    metadata: Record<string, unknown>;
    bookingStatus: string | null;
    bookingEventDate: string | null;
    bookingTotalAmount: number | null;
    venueSlug: string | null;
  };
  refunds: AdminRefundRow[];
  reconciliations: AdminPaymentReconciliationRow[];
  alerts: AdminPaymentAlertRow[];
  webhooks: AdminWebhookRow[];
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
    openAlertsResult,
    criticalAlertsResult,
    alertsResult,
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
    supabase
      .from("payment_monitoring_alerts")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "acknowledged", "investigating"]),
    supabase
      .from("payment_monitoring_alerts")
      .select("id", { count: "exact", head: true })
      .eq("severity", "critical")
      .in("status", ["open", "acknowledged", "investigating"]),
    supabase
      .from("payment_monitoring_alerts")
      .select(
        "id, transaction_id, booking_id, severity, status, title, description, detected_at",
      )
      .in("status", ["open", "acknowledged", "investigating"])
      .order("detected_at", { ascending: false })
      .limit(8),
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

  const alerts: AdminPaymentAlertRow[] = (alertsResult.data ?? []).map(
    (row: any) => ({
      id: row.id,
      transactionId: row.transaction_id,
      bookingId: row.booking_id,
      severity: row.severity,
      status: row.status,
      title: row.title,
      description: row.description,
      detectedAt: row.detected_at,
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
    openAlertCount: openAlertsResult.count ?? 0,
    criticalAlertCount: criticalAlertsResult.count ?? 0,
  };

  return {
    transactions,
    refunds,
    webhooks,
    alerts,
    kpis,
    errors: {
      transactions: transactionsResult.error?.message ?? null,
      refunds: refundsResult.error?.message ?? null,
      webhooks: webhooksResult.error?.message ?? null,
      alerts: alertsResult.error?.message ?? null,
    },
  };
}

function mapRefund(row: any): AdminRefundRow {
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
}

function mapReconciliation(row: any): AdminPaymentReconciliationRow {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    bookingId: row.booking_id,
    status: row.status,
    severity: row.severity,
    summary: row.summary,
    details: row.details,
    providerReference: row.provider_reference,
    providerAmount:
      row.provider_amount == null ? null : Number(row.provider_amount),
    venoraAmount: Number(row.venora_amount) || 0,
    providerCurrency: row.provider_currency,
    venoraCurrency: row.venora_currency ?? "PHP",
    providerStatus: row.provider_status,
    venoraStatus: row.venora_status,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

function mapAlert(row: any): AdminPaymentAlertRow {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    bookingId: row.booking_id,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    detectedAt: row.detected_at,
  };
}

export async function getAdminPaymentDetail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any> | any,
  transactionId: string,
): Promise<AdminPaymentDetail | null> {
  const transactionResult = await supabase
    .from("transactions")
    .select(
      `
        id,
        booking_id,
        amount,
        currency,
        commission_amount,
        payment_provider,
        payment_kind,
        provider_reference,
        status,
        failure_reason,
        checkout_url,
        metadata,
        paid_at,
        created_at,
        bookings (
          id,
          status,
          event_date,
          total_amount,
          venues (name, slug)
        )
      `,
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (transactionResult.error || !transactionResult.data) return null;

  const row = transactionResult.data as any;
  const booking = asOne(row.bookings);
  const venue = asOne(booking?.venues);

  const [
    refundsResult,
    reconciliationsResult,
    alertsResult,
    webhooksResult,
  ] = await Promise.all([
    supabase
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
          bookings (id, venues (name))
        `,
      )
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_reconciliation_records")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payment_monitoring_alerts")
      .select(
        "id, transaction_id, booking_id, severity, status, title, description, detected_at",
      )
      .eq("transaction_id", transactionId)
      .order("detected_at", { ascending: false })
      .limit(10),
    supabase
      .from("payment_webhook_events")
      .select(
        "id, provider, event_id, event_type, status, error, received_at, processed_at",
      )
      .eq("provider", row.payment_provider)
      .order("received_at", { ascending: false })
      .limit(20),
  ]);

  return {
    transaction: {
      id: row.id,
      bookingId: row.booking_id,
      amount: Number(row.amount) || 0,
      currency: row.currency ?? "PHP",
      commissionAmount: Number(row.commission_amount) || 0,
      status: row.status,
      paymentProvider: row.payment_provider,
      paymentKind: row.payment_kind ?? "deposit",
      providerReference: row.provider_reference,
      failureReason: row.failure_reason,
      checkoutUrl: row.checkout_url,
      metadata: row.metadata ?? {},
      paidAt: row.paid_at,
      createdAt: row.created_at,
      venueName: venue?.name ?? "Unknown venue",
      venueSlug: venue?.slug ?? null,
      bookingStatus: booking?.status ?? null,
      bookingEventDate: booking?.event_date ?? null,
      bookingTotalAmount:
        booking?.total_amount == null ? null : Number(booking.total_amount),
    },
    refunds: (refundsResult.data ?? []).map(mapRefund),
    reconciliations: (reconciliationsResult.data ?? []).map(mapReconciliation),
    alerts: (alertsResult.data ?? []).map(mapAlert),
    webhooks: (webhooksResult.data ?? []).map((webhook: any) => ({
      id: webhook.id,
      provider: webhook.provider,
      eventId: webhook.event_id,
      eventType: webhook.event_type,
      status: webhook.status,
      error: webhook.error,
      receivedAt: webhook.received_at,
      processedAt: webhook.processed_at,
    })),
  };
}
