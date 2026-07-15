import { describe, expect, it } from "vitest";
import { auditLogFiltersSchema } from "./audit-log-filters.schema";

describe("auditLogFiltersSchema", () => {
  it("defaults to page 1 with no filters", () => {
    const result = auditLogFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(1);
  });

  it("coerces a string page number from URL searchParams", () => {
    const result = auditLogFiltersSchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(3);
  });

  it("rejects page 0 or negative", () => {
    expect(auditLogFiltersSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(auditLogFiltersSchema.safeParse({ page: "-1" }).success).toBe(false);
  });

  it("rejects a malformed resourceId that isn't a uuid", () => {
    const result = auditLogFiltersSchema.safeParse({
      resourceId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed dateFrom", () => {
    const result = auditLogFiltersSchema.safeParse({ dateFrom: "07/11/2026" });
    expect(result.success).toBe(false);
  });

  it("accepts a fully-specified filter set", () => {
    const result = auditLogFiltersSchema.safeParse({
      action: "venue.approved",
      resourceType: "venue",
      resourceId: "11111111-1111-1111-1111-111111111111",
      actorId: "22222222-2222-2222-2222-222222222222",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      page: "2",
    });
    expect(result.success).toBe(true);
  });
});
