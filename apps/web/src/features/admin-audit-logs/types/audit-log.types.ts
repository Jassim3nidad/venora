export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditLogFilters = {
  action?: string | undefined;
  resourceType?: string | undefined;
  resourceId?: string | undefined;
  actorId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
};

export type AuditLogPage = {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
};
