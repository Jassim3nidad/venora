# Storage Upload Permission Failure

## Purpose

Restore a valid upload without weakening bucket or tenant policy.

## Symptoms

Upload/signed-upload returns unauthorized, forbidden, bucket missing, MIME, or size error.

## Impact

Avatar, venue, supplier, review, or verification workflow is blocked.

## Preconditions

Bucket, object path, user/role/status/owner, file metadata/size, environment, error.

## Safety warnings

Do not make a private bucket public, grant broad writes, use service role client-side, or upload sensitive test files.

## Investigation steps

1. Match bucket/path and owner prefix to documented policy.
2. Confirm session, role/approval/admin permission, bucket existence, MIME and size.
3. Reproduce with allowed user and other-tenant negative fixture.

## Diagnostic commands

```bash
rg -n "storage.objects|venue-images|avatars|verification-docs|review-photos" supabase/migrations apps/web/src
supabase migration list --linked
```

## Expected evidence

Exact rejected predicate or metadata rule and proof another tenant remains denied.

## Resolution steps

Correct path/metadata/session or add a narrow reviewed forward policy/application fix.
Re-upload only after authorization; update references atomically.

## Validation

Allowed upload/read/delete behavior passes; wrong user/path/type/size fails.

## Rollback or recovery

Remove only confirmed orphan test objects; apply restrictive forward policy if exposure risk.

## Escalation criteria

Sensitive document, cross-tenant access, broad bucket outage, or policy ambiguity.

## Required secrets or permissions

Dedicated user fixture, Storage metadata/policy read, approved migration rights if needed.

## Related documentation

[Storage](../storage.md), [authorization](../authorization.md), and
[verification documents](19-verification-document-access.md).
