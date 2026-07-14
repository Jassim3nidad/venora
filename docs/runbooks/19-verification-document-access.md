# Verification-Document Access Failure

## Purpose

Restore authorized private-document access without exposing files publicly.

## Symptoms

Owner/admin cannot upload/read, signed URL expires unexpectedly, or unauthorized access is suspected.

## Impact

Partner verification is blocked or sensitive identity/business documents may be exposed.

## Preconditions

Object path, owner/application, requesting user/permission, URL creation/expiry, timestamp.

## Safety warnings

Keep `verification-docs` private. Never share signed URLs in public tickets or extend lifetime as a blanket fix.

## Investigation steps

1. Confirm authenticated user, owner/application relationship, admin permission, and exact path.
2. Check private bucket/policy, signed URL issuance and expiry, object existence, audit evidence.
3. If exposure is possible, revoke/contain access and preserve logs immediately.

## Diagnostic commands

```bash
rg -n "verification-docs|signed.*url|verification" apps/web/src apps/web/app supabase/migrations
supabase migration list --linked
```

## Expected evidence

Authorization decision, object metadata, URL issuer/expiry, and access/audit timeline.

## Resolution steps

Correct owner/path/permission or narrow policy via migration; issue a new short-lived URL only after reauthorization.

## Validation

Owner/authorized admin succeeds; other users/expired URL/public access fail.

## Rollback or recovery

Revoke active links/permissions, move or replace exposed object under approved incident handling.

## Escalation criteria

Any unauthorized production access, personal data exposure, or missing audit trail.

## Required secrets or permissions

Storage policy/metadata read, explicit verification-document admin permission, security lead if exposed.

## Related documentation

[Storage](../storage.md), [security policy](../../SECURITY.md), and
[cross-account exposure](07-cross-account-exposure-suspicion.md).
