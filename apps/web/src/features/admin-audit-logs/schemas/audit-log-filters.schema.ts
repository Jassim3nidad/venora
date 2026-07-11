import { z } from "zod";

/**
 * Parses raw URL searchParams into typed audit-log filters. Every field is
 * optional — an empty object means "no filters, first page."
 */
export const auditLogFiltersSchema = z.object({
  action: z.string().trim().max(200).optional(),
  resourceType: z.string().trim().max(100).optional(),
  resourceId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;
