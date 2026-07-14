# Analytics Export Failure

## Purpose

Restore authorized CSV/PDF export without leaking or corrupting tenant data.

## Symptoms

Export is empty, forbidden, times out, downloads invalid data, or shows another tenant.

## Impact

Reporting blocked; potential privacy/security incident if scope is wrong.

## Preconditions

Route/format, user role/admin permission, tenant, filters/date range, request ID/time.

## Safety warnings

Do not bypass RLS/permissions, export production data to a personal device, or disable range limits.

## Investigation steps

1. Confirm authentication, owner/tenant, admin permission, and server-side guard.
2. Compare authorized source query/RPC to dashboard result and filters.
3. Inspect empty-data handling, CSV escaping/formula defense, PDF render, timeout/memory/logs.

## Diagnostic commands

```bash
rg -n "csv|pdf|export|analytics" apps/web/app apps/web/src/features
pnpm --filter @venora/web test -- analytics
```

## Expected evidence

Exact authorization/query/render stage, scoped row count, format error, and timing.

## Resolution steps

Fix the smallest server guard/query/export issue; add range/pagination/escaping safeguards and tests.

## Validation

Correct tenant/role exports expected rows; other tenant/unauthorized caller is denied; empty scope is safe.

## Rollback or recovery

Disable export route while retaining dashboard if leakage/corruption is possible.

## Escalation criteria

Cross-tenant data, personal/financial export leakage, or production performance impact.

## Required secrets or permissions

Dedicated owner/admin fixtures, analytics permission, server logs; production export approval.

## Related documentation

[Analytics](../analytics.md), [authorization](../authorization.md), and
[cross-account exposure](07-cross-account-exposure-suspicion.md).
