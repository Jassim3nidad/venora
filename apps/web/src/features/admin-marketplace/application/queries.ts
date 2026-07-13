import { createClient } from "@/lib/supabase/server";
import type {
  CancellationSignal,
  MarketplaceFlag,
  PriceOutlierSignal,
  RepeatedRejectionSignal,
  TransactionSignal,
} from "../types/marketplace.types";

export async function getMarketplaceFlags(status?: string): Promise<{
  flags: MarketplaceFlag[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  let query = supabase
    .from("marketplace_flags")
    .select(
      "id, entity_type, entity_id, flag_type, severity, status, notes, created_at, resolved_at, assignee:assigned_to (full_name), creator:created_by (full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return { flags: null, error: error.message };

  const flags: MarketplaceFlag[] = (data ?? []).map((row: any) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    flagType: row.flag_type,
    severity: row.severity,
    status: row.status,
    notes: row.notes,
    assignedToName: row.assignee?.full_name ?? null,
    createdByName: row.creator?.full_name ?? null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));

  return { flags, error: null };
}

const REJECTION_LOOKBACK_DAYS = 180;

export async function getRepeatedRejectionSignals(): Promise<RepeatedRejectionSignal[]> {
  const supabase = (await createClient()) as any;
  const since = new Date(Date.now() - REJECTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: venueRejections }, { data: supplierRejections }] = await Promise.all([
    supabase
      .from("venue_review_history")
      .select("venue_id, venues(name)")
      .eq("action", "reject")
      .gte("created_at", since),
    supabase
      .from("supplier_review_history")
      .select("supplier_id, supplier_profiles(business_name)")
      .eq("action", "reject")
      .gte("created_at", since),
  ]);

  const venueCounts = new Map<string, { label: string; count: number }>();
  for (const row of (venueRejections ?? []) as any[]) {
    const existing = venueCounts.get(row.venue_id);
    const label = row.venues?.name ?? "Unknown venue";
    venueCounts.set(row.venue_id, { label, count: (existing?.count ?? 0) + 1 });
  }

  const supplierCounts = new Map<string, { label: string; count: number }>();
  for (const row of (supplierRejections ?? []) as any[]) {
    const existing = supplierCounts.get(row.supplier_id);
    const label = row.supplier_profiles?.business_name ?? "Unknown supplier";
    supplierCounts.set(row.supplier_id, { label, count: (existing?.count ?? 0) + 1 });
  }

  const signals: RepeatedRejectionSignal[] = [];
  for (const [id, { label, count }] of venueCounts) {
    if (count >= 2) signals.push({ entityType: "venue", entityId: id, label, rejectionCount: count });
  }
  for (const [id, { label, count }] of supplierCounts) {
    if (count >= 2) signals.push({ entityType: "supplier", entityId: id, label, rejectionCount: count });
  }

  return signals.sort((a, b) => b.rejectionCount - a.rejectionCount);
}

const CANCELLATION_LOOKBACK_DAYS = 90;

export async function getCancellationSignals(): Promise<CancellationSignal[]> {
  const supabase = (await createClient()) as any;
  const since = new Date(Date.now() - CANCELLATION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("bookings")
    .select("venue_id, venues(name)")
    .eq("status", "cancelled")
    .gte("updated_at", since);

  const counts = new Map<string, { label: string; count: number }>();
  for (const row of (data ?? []) as any[]) {
    const existing = counts.get(row.venue_id);
    counts.set(row.venue_id, { label: row.venues?.name ?? "Unknown venue", count: (existing?.count ?? 0) + 1 });
  }

  return Array.from(counts.entries())
    .filter(([, v]) => v.count >= 3)
    .map(([venueId, v]) => ({ venueId, venueName: v.label, cancellationCount: v.count }))
    .sort((a, b) => b.cancellationCount - a.cancellationCount);
}

async function getTransactionSignals(statuses: string[], limit = 20): Promise<TransactionSignal[]> {
  const supabase = (await createClient()) as any;

  const { data } = await supabase
    .from("transactions")
    .select("id, booking_id, amount, status, created_at, bookings(venues(name))")
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    venueName: row.bookings?.venues?.name ?? null,
    amount: Number(row.amount),
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function getPaymentFailureSignals() {
  return getTransactionSignals(["failed"]);
}

export function getRefundSignals() {
  return getTransactionSignals(["refunded", "partially_refunded"]);
}

/**
 * Simple statistical outlier check (>2 standard deviations from the mean
 * base_price across published venues) — not a fraud signal, just a
 * "worth a human look" flag. No ML/heuristic beyond this exists in the
 * schema, and none is fabricated here.
 */
export async function getPriceOutlierSignals(): Promise<PriceOutlierSignal[]> {
  const supabase = (await createClient()) as any;

  const { data } = await supabase.from("venues").select("id, name, base_price").eq("status", "published");
  const venues = (data ?? []) as { id: string; name: string; base_price: number }[];
  if (venues.length < 5) return []; // not enough data for a meaningful stddev

  const prices = venues.map((v) => Number(v.base_price));
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return [];

  return venues
    .map((v) => ({
      venueId: v.id,
      venueName: v.name,
      basePrice: Number(v.base_price),
      meanPrice: Math.round(mean),
      deviation: Number(((Number(v.base_price) - mean) / stddev).toFixed(1)),
    }))
    .filter((v) => Math.abs(v.deviation) > 2)
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}
