import { createClient } from "@/lib/supabase/server";
import type { AuditLogEntry, AuditLogFilters, AuditLogPage } from "../types/audit-log.types";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

/**
 * Server-side paginated, filterable read of audit_logs. All filtering and
 * pagination happens in the query (never fetch-everything-then-slice) so
 * this scales past a handful of rows. RLS additionally restricts this to
 * accounts with the audit_logs.view permission (migration 054) — an
 * unpermitted caller gets an empty result set from Postgres, which is why
 * the page itself also calls requirePermission("audit_logs.view") for a
 * clear Forbidden state instead of a confusing "no results."
 */
export async function getAuditLogs(
  filters: AuditLogFilters,
): Promise<{ result: AuditLogPage | null; error: string | null }> {
  const supabase = (await createClient()) as any;

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(filters.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_logs")
    .select(
      `
      id, actor_id, actor_role, action, entity_type, entity_id,
      reason, metadata, previous_values, new_values, created_at,
      profiles:actor_id (full_name)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.action) query = query.ilike("action", `%${filters.action}%`);
  if (filters.resourceType) query = query.eq("entity_type", filters.resourceType);
  if (filters.resourceId) query = query.eq("entity_id", filters.resourceId);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00Z`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59Z`);

  const { data, count, error } = await query;

  if (error) {
    return { result: null, error: error.message };
  }

  const entries: AuditLogEntry[] = ((data ?? []) as AuditLogRow[]).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.profiles?.full_name ?? null,
    actorRole: row.actor_role,
    action: row.action,
    resourceType: row.entity_type,
    resourceId: row.entity_id,
    reason: row.reason,
    metadata: row.metadata,
    previousValues: row.previous_values,
    newValues: row.new_values,
    createdAt: row.created_at,
  }));

  return { result: { entries, total: count ?? 0, page, pageSize }, error: null };
}
