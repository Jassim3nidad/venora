# Supabase RPC Functions

Inventory of 94 final `public` database function names derived from migrations through `069` at commit `15e6173`. This separates application RPCs from service-only functions, RLS helpers, and trigger/internal functions. Trigger functions are not public application APIs even though they live in `public`.

## Calling convention

PostgREST RPC endpoint:

```text
POST ${SUPABASE_URL}/rest/v1/rpc/{function_name}
apikey: ${SUPABASE_ANON_KEY}
Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}
Content-Type: application/json
```

Arguments use PostgreSQL parameter names, normally `p_*`. Return rows use database `snake_case`. Database exceptions become PostgREST errors; Next.js actions/handlers map them to application errors.

No database function implements an independent request-per-second limiter. Authorization, state locks, constraints, RLS, and idempotency keys are not substitutes for rate limiting.

## Application/authenticated RPCs (33)

### Booking and payment workflow

| Function                  | Arguments -> return                                                                   | Access                                                        | Purpose, side effects, idempotency                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `create_booking_inquiry`  | venue/package UUID, event date, guests, optional requests/start/end -> `bookings` row | Authenticated; caller becomes customer; venue/state checks    | Locks/checks date, inserts pending booking and history; notification/availability triggers. Duplicate active slot rejected         |
| `approve_booking_quote`   | booking UUID, total, optional deposit/note -> `bookings` row                          | Venue org member/admin                                        | Sets approved amounts/due time; deposit invoice and notifications. State guarded                                                   |
| `decline_booking_request` | booking UUID, reason -> `bookings` row                                                | Venue org member/admin                                        | Sets declined status/reason and notifications. State guarded                                                                       |
| `cancel_booking_request`  | booking UUID, optional reason -> `bookings` row                                       | Customer, venue org member, or admin according to workflow    | Cancels once, restores availability, logs one status change after migration 064, notifies participants                             |
| `complete_booking_event`  | booking UUID -> `bookings` row                                                        | Venue-side/admin workflow authorization                       | Marks eligible confirmed booking complete and requests review                                                                      |
| `start_booking_payment`   | booking UUID, provider, optional checkout URL/reference -> `transactions` row         | Authenticated booking customer; service role also granted     | Locks booking, creates/reuses one pending deposit transaction, moves to payment pending. Idempotent for active pending transaction |
| `request_booking_refund`  | booking UUID, optional reason -> `refunds` row                                        | Authenticated eligible participant; service role also granted | Validates cancelled/paid state and refundable amount; creates/reuses eligible refund according to constraints                      |

### Venue, supplier, analytics, and AI

| Function                          | Arguments -> return                                                                               | Access                                                                             | Purpose, side effects, idempotency                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `create_venue_transaction`        | organization and venue fields, package JSON, amenity text array, optional simulation flag -> JSON | Authenticated venue owner/coordinator/admin; function rechecks organization access | Atomic venue/package/amenity create. Not idempotent                                                               |
| `get_venue_analytics`             | venue UUID, optional from/to/granularity -> period table                                          | Authorized by function/RLS                                                         | Aggregated booking revenue, commission, rating. Read-only                                                         |
| `match_venues`                    | vector, threshold/count and location/capacity/price filters -> venue table                        | Search callers; published venues only                                              | Legacy semantic venue matching. Read-only                                                                         |
| `search_venues`                   | optional vector/keyword/location/budget/guests/type/feature/count/sort -> rich venue table        | Search callers; published venues only                                              | Hybrid search used by AI Edge Functions. Read-only, count defaults 24                                             |
| `record_recommendation_click`     | recommendation event UUID -> void                                                                 | Authenticated                                                                      | Marks caller-owned recommendation event clicked. Repeated call converges on clicked timestamp/state               |
| `respond_supplier_quote_customer` | quote UUID, `accepted\|declined` -> JSON                                                          | Authenticated inquiry customer                                                     | Validates participant/current state, updates quote and inquiry tracking, triggers customer/supplier notifications |
| `upsert_supplier_quote_dashboard` | optional quote UUID, inquiry UUID, title, description, item JSON, fees, date, terms -> quote UUID | Owning supplier                                                                    | Creates/updates draft quote; computes/validates amounts and participants. Upsert is retry-tolerant with quote ID  |

### Notifications and access helpers

| Function                          | Arguments -> return                                                  | Access                                                                 | Purpose, side effects, idempotency                                                 |
| --------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `ensure_notification_preferences` | user UUID -> preferences row                                         | Authenticated/service role; function binds ordinary caller to own user | Inserts defaults when absent. Idempotent                                           |
| `mark_notification_read`          | notification UUID -> void                                            | Authenticated owner                                                    | Sets read timestamp. Idempotent                                                    |
| `mark_all_notifications_read`     | none -> integer                                                      | Authenticated                                                          | Marks caller's unread notifications and returns count. Idempotent after first call |
| `has_role`                        | role enum -> boolean                                                 | Session                                                                | Checks current user's role; read-only                                              |
| `is_admin`                        | none -> boolean                                                      | Session                                                                | Checks current user admin role; read-only                                          |
| `has_admin_permission`            | permission text -> boolean                                           | Session                                                                | Resolves active admin tier/overrides; read-only                                    |
| `log_report_export`               | report type, format, optional filters/row count -> report export row | Authenticated with `reports.export` rechecked in function              | Writes export record and audit row. Not idempotent                                 |

### Administrator RPCs

Every function below is `SECURITY DEFINER`, explicitly revoked from `PUBLIC`, granted to `authenticated`, and rechecks the required permission internally.

| Function                            | Arguments -> return                                                                            | Required permission / effect                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `admin_assign_tier`                 | target user UUID, admin tier, optional reason -> admin-role row                                | `admin_roles.manage`; tier assignment and audit; protects self/last super admin                        |
| `admin_review_venue`                | venue UUID, review action, optional reason -> venue row                                        | Action maps to venue review/approve/reject/suspend permission; status transition, audit, notifications |
| `admin_review_supplier`             | supplier UUID, review action, optional reason -> supplier row                                  | Supplier review/approve/reject/suspend permission; status transition, audit, notifications             |
| `admin_set_account_status`          | profile UUID, status, optional reason -> profile row                                           | `users.suspend\|users.reactivate`; account status/audit; self/last-super-admin protection              |
| `admin_approve_partner_application` | application UUID -> void                                                                       | Admin check; approves application and assigns requested role atomically                                |
| `admin_deny_partner_application`    | application UUID, reason -> void                                                               | Admin check; denies with reason                                                                        |
| `admin_create_commission_rule`      | scope/reference/label/rate/fees/bounds/dates/reason -> rule row                                | `commissions.manage`; inserts rule and audit                                                           |
| `admin_update_commission_rule`      | rule UUID and full editable fields plus active/reason -> rule row                              | `commissions.override`; updates rule and audit                                                         |
| `admin_create_marketplace_flag`     | entity type/UUID, flag type, severity, notes -> flag row                                       | `marketplace.moderate`; inserts flag and audit                                                         |
| `admin_update_marketplace_flag`     | flag UUID, optional state/assignee/notes/reason -> flag row                                    | `marketplace.moderate`; updates flag and audit                                                         |
| `admin_update_system_setting`       | key, JSON value, optional reason -> setting row                                                | `system_settings.manage`; validates known key/type, updates and audits                                 |
| `admin_upsert_ai_configuration`     | feature enable/provider/model/fallback/prompt/runtime/limit fields/reason -> configuration row | `ai_config.manage`; upserts runtime AI policy and audit                                                |

## Service-role-only RPCs (15)

Never call these with a browser token or expose service-role credentials. Explicit grants/revokes in migrations 043-048, 059, 061, and 065 are part of the security boundary.

| Function                               | Arguments -> return                                                                     | Purpose                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `attach_payment_session`               | transaction UUID, provider reference, checkout URL, metadata, force flag -> transaction | First-attach-wins provider correlation; force only replaces stale session                  |
| `calculate_commission`                 | venue UUID, amount -> numeric                                                           | Legacy/internal commission calculation; service only                                       |
| `resolve_commission`                   | venue UUID, amount -> commission resolution                                             | Chooses venue/category/global rule deterministically                                       |
| `claim_payment_webhook_event`          | provider, event ID/type, payload -> boolean                                             | Atomic idempotency claim; false means already processed/in progress                        |
| `finish_payment_webhook_event`         | provider, event ID, status, optional error -> void                                      | Records processed/failed/skipped outcome; failed events are reclaimable per implementation |
| `confirm_booking_payment`              | provider, checkout reference, payment reference, amount minor, currency -> booking      | Reconciles stored transaction before confirming; receipt/commission/notifications/audit    |
| `fail_booking_payment`                 | booking UUID, provider/reference, optional reason -> booking                            | Fails matching pending payment and updates booking workflow                                |
| `mark_refund_processing`               | refund UUID, provider reference -> refund                                               | Stores provider refund correlation                                                         |
| `complete_booking_refund`              | provider/reference, optional amount -> refund                                           | Validates amount, completes refund, updates transaction/booking/audit/notifications        |
| `fail_booking_refund`                  | provider/reference, optional reason -> refund                                           | Marks correlated refund failed                                                             |
| `next_invoice_number`                  | none -> text                                                                            | Allocates invoice sequence value                                                           |
| `next_receipt_number`                  | none -> text                                                                            | Allocates receipt sequence value                                                           |
| `retry_failed_notification_deliveries` | optional limit=50 -> integer                                                            | Requeues eligible failed deliveries                                                        |
| `disable_sms_notification_deliveries`  | none -> integer                                                                         | Marks queued SMS skipped because no SMS provider is configured                             |
| `venues_for_embedding`                 | optional refresh limit=25 -> venue ID/text table                                        | Supplies service-side embedding backfill candidates                                        |

## RLS/ownership helpers (8)

These return booleans for policies and trusted application checks. They derive identity from `auth.uid()`; caller-supplied resource IDs do not change caller identity.

| Function                          | Argument          | Meaning                                                                      |
| --------------------------------- | ----------------- | ---------------------------------------------------------------------------- |
| `is_booking_customer`             | booking UUID      | Current user owns booking                                                    |
| `is_conversation_participant`     | conversation UUID | Current user participates in conversation                                    |
| `is_org_member`                   | organization UUID | Current user is member; latest fix includes owner semantics used by policies |
| `is_org_member_for_booking`       | booking UUID      | Booking venue belongs to user's organization membership                      |
| `is_org_member_for_venue`         | venue UUID        | Venue belongs to user's organization membership                              |
| `is_org_owner`                    | organization UUID | Current user owns organization                                               |
| `is_supplier_inquiry_participant` | inquiry UUID      | Current user is inquiry customer or owning supplier participant              |
| `is_supplier_owner`               | supplier UUID     | Current user owns supplier profile                                           |

## Internal non-trigger helpers (10)

| Function                             | Access/intended use                                                                                                               | Purpose                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `assert_booking_slot_available`      | Explicitly revoked from public/anon/authenticated                                                                                 | Raises on invalid/unpublished/conflicting slot; called inside trusted workflows/triggers |
| `create_notification`                | Explicitly revoked; final active signature is the 9-argument migration-036 function after migration 063 drops the legacy overload | Inserts deduped notification and audit row based on preferences                          |
| `log_admin_action`                   | Explicitly revoked                                                                                                                | Internal admin audit writer                                                              |
| `log_audit`                          | Explicitly revoked                                                                                                                | Internal general audit writer                                                            |
| `notify_admins`                      | Explicitly revoked                                                                                                                | Internal broadcast through `create_notification`                                         |
| `is_active_booking_status`           | Internal SQL helper                                                                                                               | Central blocking-status predicate                                                        |
| `partner_application_dashboard_link` | Internal notification helper                                                                                                      | Maps role to dashboard link                                                              |
| `partner_application_role_label`     | Internal notification helper                                                                                                      | Maps role to display label                                                               |
| `public_signup_role`                 | Auth trigger helper                                                                                                               | Maps untrusted signup metadata to allowed public role; excludes admin                    |
| `user_allows_notification`           | Internal notification helper                                                                                                      | Evaluates channel/kind preferences for a user                                            |

Security note: the last five helpers have no explicit revoke found in migrations. PostgreSQL commonly grants function execution to `PUBLIC` by default. Their bodies limit impact, but intended-internal functions should receive explicit grants/revokes for a clearer boundary.

## Trigger functions (28)

Not callable application contracts. Request bodies, HTTP responses, and direct retry semantics do not apply.

| Function                                   | Trigger purpose                                                      |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `check_review_eligibility`                 | Enforces eligible booking/customer before review insert              |
| `create_booking_status_notifications`      | Emits deduped booking/payment/review notifications on status changes |
| `create_partner_application_notifications` | Notifies applicant/admins on partner application lifecycle           |
| `create_payment_status_notifications`      | Emits payment/refund lifecycle notifications                         |
| `create_review_admin_notifications`        | Notifies admins about review moderation events                       |
| `create_supplier_status_notifications`     | Emits supplier review/accreditation notifications                    |
| `create_venue_status_notifications`        | Emits venue review/publication notifications                         |
| `create_verification_admin_notifications`  | Notifies admins of verification submissions                          |
| `dispatch_notification_delivery_webhook`   | Calls notification Edge Function for queued deliveries               |
| `enforce_booking_availability_integrity`   | Prevents conflicting booking insert/update                           |
| `enforce_supplier_quote_transition`        | Validates allowed supplier quote state changes                       |
| `enqueue_notification_deliveries`          | Creates channel delivery rows from notification/preferences          |
| `handle_new_user`                          | Creates profile/safe public role after auth user insert              |
| `invalidate_venue_embedding`               | Marks venue embedding stale after searchable content changes         |
| `issue_deposit_invoice`                    | Creates deposit invoice on eligible approval/payment workflow        |
| `log_booking_status_change`                | Writes booking status history/audit                                  |
| `mark_booking_reviewed`                    | Advances eligible completed booking after review                     |
| `notify_supplier_inquiry_message`          | Notifies other inquiry participant after message insert              |
| `notify_supplier_quote_customer`           | Notifies customer after quote lifecycle event                        |
| `prevent_self_role_change`                 | Blocks unsafe user role mutation                                     |
| `set_supplier_quote_participants`          | Snapshots/sets customer and supplier participants                    |
| `set_updated_at`                           | Generic timestamp maintenance                                        |
| `sync_availability_on_booking`             | Synchronizes venue availability with active bookings                 |
| `sync_profile_status_from_auth`            | Synchronizes profile after email confirmation                        |
| `sync_review_helpful_count`                | Maintains review helpful vote count                                  |
| `touch_updated_at`                         | Payment table timestamp maintenance                                  |
| `update_supplier_stats`                    | Recomputes supplier rating/count after review changes                |
| `update_venue_stats`                       | Recomputes venue rating/count after review changes                   |

## Example requests

Authenticated booking creation through raw RPC:

```bash
curl -sS "${SUPABASE_URL}/rest/v1/rpc/create_booking_inquiry" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "p_venue_id":"00000000-0000-4000-8000-000000000001",
    "p_package_id":null,
    "p_event_date":"2027-02-20",
    "p_guest_count":120,
    "p_special_requests":"Wheelchair-accessible entrance"
  }'
```

Success is the returned booking row. A database exception returns a PostgREST error similar to:

```json
{
  "code": "P0001",
  "message": "Venue is unavailable on the selected date",
  "details": null,
  "hint": null
}
```

Prefer the Next.js Route Handler/Server Action when one exists; it provides stable application validation, error mapping, cache invalidation, and provider orchestration.

## Database assumptions and risks

- All `SECURITY DEFINER` functions must keep a fixed safe `search_path`; migrations were inspected, but live grants were not queried in this documentation run.
- Two migrations share prefix `068`; filename ordering, not numeric uniqueness, determines local application order. Both functions documented here are present in repository migrations, but live schema parity requires migration verification.
- Function definitions changed across migrations. This document uses the final intended active definition, including the 9-argument `create_notification` after overload cleanup.
- RLS and function grants must be verified against the deployed database; source inspection cannot prove production grants.
