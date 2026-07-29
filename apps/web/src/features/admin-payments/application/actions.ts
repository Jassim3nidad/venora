"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/rbac/admin-context";
import { evaluatePaymentReconciliation } from "./payment-reconciliation";

type WebhookEvidence = {
  id: string;
  eventType: string;
  status: string;
  amount: number | null;
  currency: string | null;
};

function findNumberByKey(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumberByKey(item, key);
      if (found != null) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record[key] === "number") return record[key] as number;

  for (const item of Object.values(record)) {
    const found = findNumberByKey(item, key);
    if (found != null) return found;
  }
  return null;
}

function findStringByKey(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, key);
      if (found != null) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record[key] === "string") return record[key] as string;

  for (const item of Object.values(record)) {
    const found = findStringByKey(item, key);
    if (found != null) return found;
  }
  return null;
}

function providerStatusFromWebhook(row: {
  event_type: string;
  status: string;
  payload: unknown;
}) {
  const explicitStatus = findStringByKey(row.payload, "status");
  if (explicitStatus) return explicitStatus;
  if (row.event_type.includes("paid") || row.event_type.includes("succeeded")) {
    return "paid";
  }
  if (row.event_type.includes("failed")) return "failed";
  return row.status;
}

async function findWebhookEvidence(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  provider: string,
  providerReference: string | null,
): Promise<WebhookEvidence | null> {
  if (!providerReference) return null;

  const { data } = await supabase
    .from("payment_webhook_events")
    .select("id, event_type, status, payload")
    .eq("provider", provider)
    .order("received_at", { ascending: false })
    .limit(50);

  const match = (data ?? []).find((row: any) =>
    JSON.stringify(row.payload ?? {}).includes(providerReference),
  );

  if (!match) return null;

  const amountMinor = findNumberByKey(match.payload, "amount");
  return {
    id: match.id,
    eventType: match.event_type,
    status: providerStatusFromWebhook(match),
    amount: amountMinor == null ? null : amountMinor / 100,
    currency: findStringByKey(match.payload, "currency"),
  };
}

export async function runPaymentReconciliationAction(formData: FormData) {
  const admin = await requirePermission("payments.reconcile");
  const transactionId = String(formData.get("transactionId") ?? "").trim();

  if (!transactionId) {
    throw new Error("Missing transaction id.");
  }

  const supabase = (await createClient()) as any;
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(
      "id, booking_id, amount, currency, status, payment_provider, provider_reference",
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !transaction) {
    throw new Error(error?.message || "Transaction not found.");
  }

  const evidence = await findWebhookEvidence(
    supabase,
    transaction.payment_provider,
    transaction.provider_reference,
  );
  const result = evaluatePaymentReconciliation({
    transactionStatus: transaction.status,
    transactionAmount: Number(transaction.amount) || 0,
    transactionCurrency: transaction.currency ?? "PHP",
    providerAmount: evidence?.amount ?? null,
    providerCurrency: evidence?.currency ?? null,
    providerStatus: evidence?.status ?? null,
    hasProviderReference: Boolean(transaction.provider_reference),
  });

  const { data: reconciliation, error: insertError } = await supabase
    .from("payment_reconciliation_records")
    .insert({
      transaction_id: transaction.id,
      booking_id: transaction.booking_id,
      status: result.status,
      provider: transaction.payment_provider,
      provider_reference: transaction.provider_reference,
      provider_amount: evidence?.amount ?? null,
      venora_amount: Number(transaction.amount) || 0,
      provider_currency: evidence?.currency ?? null,
      venora_currency: transaction.currency ?? "PHP",
      provider_status: evidence?.status ?? null,
      venora_status: transaction.status,
      severity: result.severity,
      summary: result.title,
      details: result.description,
      metadata: {
        webhook_event_id: evidence?.id ?? null,
        webhook_event_type: evidence?.eventType ?? null,
      },
      reviewed_by: admin.userId,
      reviewed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message || "Unable to save reconciliation.");
  }

  if (result.shouldAlert) {
    await supabase.from("payment_monitoring_alerts").insert({
      transaction_id: transaction.id,
      booking_id: transaction.booking_id,
      reconciliation_id: reconciliation.id,
      alert_type: result.status,
      severity: result.severity,
      title: result.title,
      description: result.description,
      metadata: {
        provider_reference: transaction.provider_reference,
        webhook_event_id: evidence?.id ?? null,
      },
    });
  }

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${transaction.id}`);
}
