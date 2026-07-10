# Payments Module

PayMongo-backed deposit checkout, refunds, invoices, receipts, commission
capture, and payment audit logging — behind a provider abstraction so Maya
and Stripe can be added without touching use-cases, routes, or UI.

## Folder Structure

- `apps/web/src/features/payments/domain/gateways/payment-gateway.port.ts` - the `PaymentGateway` interface (provider abstraction boundary).
- `apps/web/src/features/payments/domain/value-objects/money.vo.ts` - major/minor unit conversions (PHP pesos <-> centavos).
- `apps/web/src/features/payments/application/gateway-registry.ts` - lazy provider registry (`registerGateway` / `getGateway` / `listAvailableProviders`).
- `apps/web/src/features/payments/application/use-cases/start-checkout.usecase.ts` - creates/reuses the deposit transaction and provider checkout session.
- `apps/web/src/features/payments/application/use-cases/request-refund.usecase.ts` - refund request + provider refund creation.
- `apps/web/src/features/payments/application/use-cases/process-webhook-event.usecase.ts` - signature verification, idempotent claim, event dispatch.
- `apps/web/src/features/payments/infrastructure/paymongo/paymongo.gateway.ts` - PayMongo Checkout Sessions + Refunds implementation.
- `apps/web/src/features/payments/infrastructure/register-gateways.ts` - central provider wiring (env-gated).
- `apps/web/src/features/payments/schemas/payment.schema.ts` - Zod schemas for payment/refund inputs.
- `apps/web/src/features/payments/types/payment.types.ts` - row types mirroring the DB schema.
- `apps/web/src/features/payments/ui/refund-request-form.tsx` - customer refund request control.
- `apps/web/src/features/payments/ui/payment-documents.tsx` - invoice/receipt/refund cards (server-renderable).
- `apps/web/src/features/payments/ui/pending-payment-refresh.tsx` - polls while a payment awaits webhook confirmation.
- `apps/web/app/api/bookings/[id]/payment/route.ts` - start checkout.
- `apps/web/app/api/bookings/[id]/refund/route.ts` - request refund.
- `apps/web/app/api/webhooks/paymongo/route.ts` - PayMongo webhook receiver.
- `apps/web/src/lib/supabase/service.ts` - service-role client (webhooks/refund settlement only).
- `supabase/migrations/038_payments_platform.sql` - schema, RPCs, RLS, audit.
- `supabase/migrations/039_fix_payment_grants.sql` - fixes a grant-inheritance bug (see Security Considerations) that left service-only RPCs callable via the public anon key.
- `supabase/migrations/040_payment_confirmation_reconciliation.sql` - replaces `confirm_booking_payment` with a reconciled version (exact checkout reference / amount / currency match).
- `supabase/migrations/041_explicit_role_revoke.sql` - the `FROM PUBLIC` revoke in 038/040 turned out insufficient (Supabase's own default-privileges convention grants `EXECUTE` directly to `anon`/`authenticated` on new functions); this explicitly revokes from all three by name.
- `supabase/migrations/042_checkout_session_race_fix.sql` - first-attach-wins on `attach_payment_session` so two concurrent checkout requests can't clobber each other's provider session reference.
- `supabase/scripts/verify-payment-rpc-grants.sql` - dynamic (pg_proc-driven) regression check using both `aclexplode` and `has_function_privilege`; run after touching any payment function grant.

## Database Schema

New enums: `refund_status` (`pending, processing, succeeded, failed, cancelled`),
`invoice_status` (`issued, paid, void, refunded`).

New tables:

- `refunds` - one in-flight refund per transaction (partial unique index);
  `provider_reference` stores the provider refund id (`ref_...`).
- `invoices` - deposit invoice auto-issued when a booking is approved
  (`bookings_issue_deposit_invoice` trigger); numbered `INV-YYYY-000001`;
  one open invoice per booking.
- `receipts` - immutable, issued inside `confirm_booking_payment`;
  numbered `RCPT-YYYY-000001`; `UNIQUE(transaction_id)` keeps issuance idempotent.
- `payment_webhook_events` - idempotency ledger; `UNIQUE(provider, event_id)`
  guarantees at-most-once processing, failed events are re-claimable on retry.

RPCs:

- `start_booking_payment` (updated) - creates/reuses pending deposit transaction, audits `payment.started`. `authenticated` only.
- `attach_payment_session` (new, service_role only) - persists provider session reference + hosted checkout URL. Not client-callable: `provider_reference` feeds webhook correlation, so it must never be attacker-settable.
- `confirm_booking_payment(p_payment_provider, p_checkout_reference, p_payment_reference, p_amount_minor, p_currency)` (migration 040, service_role only) - **reconciles before writing anything.** Looks up the pending deposit transaction by `(payment_provider, provider_reference = p_checkout_reference)` — the booking id is *derived* from that row, never trusted from webhook metadata. Requires `p_amount_minor` to exactly equal `ROUND(transaction.amount * 100)` and `p_currency` to match (case-insensitive), or it raises before touching any row. On success it computes commission via `calculate_commission`, marks the invoice paid, issues the receipt, confirms the booking, audits `payment.confirmed`, and overwrites `provider_reference` with the settled payment id (needed later for refunds). Idempotent for already-confirmed bookings. Any raised mismatch is caught by an exception handler that writes `payment.reconciliation_failed` to `audit_logs` (message only, no payload) and re-raises, so the caller still sees the failure.
- `fail_booking_payment` (updated) - fails pending transaction, reverts booking to `approved`, audits `payment.failed`.
- `request_booking_refund` (new, authenticated) - customer/org member/admin; only for `cancelled` bookings with a paid transaction; audits `refund.requested`.
- `mark_refund_processing`, `complete_booking_refund`, `fail_booking_refund` (new, service_role only) - provider refund lifecycle; completing a refund flips the transaction to `refunded`/`partially_refunded` and the invoice to `refunded`; audits each step.
- `claim_payment_webhook_event` / `finish_payment_webhook_event` (new, service_role only) - webhook idempotency.
- `calculate_commission(venue_id, amount)` (new) - resolves `commission_rules` with venue > category > global precedence; percentage and flat fee combine; capped at the paid amount.

## API Design

All endpoints return `{ data, error }` envelopes per `docs/conventions/api-conventions.md`.

- `POST /api/bookings/:id/payment` `{ provider? }` → `{ transactionId, amount, provider, checkoutUrl, status }`.
  The client redirects the browser to `checkoutUrl` (PayMongo-hosted page).
  Retries resume the existing session. 401 unauthenticated, 402 provider errors, 400 invalid state.
- `POST /api/bookings/:id/refund` `{ reason? }` → `{ refundId, amount, status }`.
  `status` is `processing` (webhook settles it) or `succeeded` (synchronous settlement).
- `POST /api/webhooks/paymongo` - raw-body HMAC verification (`Paymongo-Signature`,
  test `te=` / live `li=`) **before** any JSON parsing, then idempotent claim, then dispatch:
  - `checkout_session.payment.paid` → reconciled `confirm_booking_payment` (the checkout session's own id is the reference that must match)
  - `payment.paid` (a direct payment event, not scoped to a checkout session) → cannot be reconciled against a session reference, so it is **not** auto-confirmed; recorded `skipped` and logged for manual review
  - `payment.failed` → `fail_booking_payment`
  - `payment.refunded`, `payment.refund.updated` → `complete_booking_refund` / `fail_booking_refund`
  - unknown events → recorded as `skipped`.
  Responses: 401 bad signature, 500 on processing/reconciliation failure (PayMongo retries; the event re-claims because failed events are retryable), 200 otherwise (including reconciliation-skips, since retrying those would never help).

The `startBookingPaymentAction` server action wraps the same
`startCheckout` use-case for in-app forms.

## Provider Abstraction

`PaymentGateway` (port) exposes `createCheckoutSession`, `createRefund`,
`verifyWebhookSignature`, `parseWebhookEvent` (normalized event union).
Adding Maya/Stripe:

1. Implement the port under `infrastructure/<provider>/`.
2. Register it in `register-gateways.ts` behind its env keys.
3. Add a webhook route `app/api/webhooks/<provider>/route.ts` that calls
   the shared `processWebhookEvent` use-case.

The UI provider selector renders from `listAvailableProviders()`, so
unconfigured providers never appear.

## Money Handling

DB stores `numeric(12,2)` PHP major units; providers bill in centavos.
All conversion goes through `money.vo.ts` (`toMinorUnits`/`fromMinorUnits`)
— never multiply by 100 inline.

## Commission

`confirm_booking_payment` stamps `transactions.commission_amount` using
`calculate_commission` at capture time, so later rule changes don't
rewrite history. `complete_booking_event` (module 021) already nets
commission out of payouts.

## Invoices & Receipts

- Invoice issued automatically on approval for the deposit amount, due at
  `payment_due_at`; line items stored as JSONB.
- Receipt issued automatically on payment confirmation, linked to the
  invoice and transaction.
- Both render on `/bookings/:id/payment` ("Billing documents") and the
  receipt on `/bookings/:id/confirmation`.

## Refund & Cancellation Flow

1. Customer (or owner/admin) cancels via the existing `cancel_booking_request`.
2. On the payment page of a cancelled, paid booking, "Request Refund"
   calls `POST /api/bookings/:id/refund`.
3. `request_booking_refund` validates state and creates a `pending` refund.
4. The gateway creates the provider refund; `mark_refund_processing`
   stores the `ref_...` reference.
5. The webhook settles it (`complete_booking_refund` / `fail_booking_refund`).
   Transactions without a provider reference stay `pending` for manual
   admin settlement.

## Error Handling

- Domain/application errors are `VenoraError` subclasses (`PaymentError`
  402, `PaymentProviderNotAvailableError`, `RefundError`); routes map them
  to `{ error: { code, message } }` with the right HTTP status.
- Provider API failures log the PayMongo error detail server-side and
  surface a generic message to the customer.
- Webhook failures are recorded on the event row (`status='failed'`, `error`)
  and audited; PayMongo retries re-claim them.

## Loading / Empty States

- Checkout button shows a spinner during session creation, then hard-redirects.
- Confirmation page polls (5s, 2min cap) while `payment_pending`.
- Billing documents panel has an explicit empty state ("Your invoice will
  appear here once the venue approves your booking.").

## Security Considerations

- **Fixed 2026-07: PUBLIC-grant payment bypass (critical).** Migration 038
  (and pre-existing migration 021) locked down service-only RPCs with
  `REVOKE EXECUTE ... FROM anon, authenticated`. That is insufficient:
  Postgres grants `EXECUTE` on new functions to `PUBLIC` by default, and
  both `anon` and `authenticated` inherit `PUBLIC`. Revoking only from
  the child roles leaves the `PUBLIC` grant intact, so the functions —
  including `confirm_booking_payment` — remained callable with the
  public anon key. Live verification against the hosted project
  confirmed anon could call `confirm_booking_payment` and every other
  service-only RPC (business-logic errors came back, not `permission
  denied`). Fixed in `039_fix_payment_grants.sql` /
  `040_payment_confirmation_reconciliation.sql`:
  `REVOKE EXECUTE ... FROM PUBLIC` (which covers anon + authenticated),
  then grant only the intended role back. `supabase/scripts/verify-payment-rpc-grants.sql`
  is a standing regression check — run it after touching any payment
  function grant; it fails loudly if this class of bug reappears.
- **Payment confirmation reconciliation (migration 040).** Before
  `040`, `confirm_booking_payment` matched "any pending deposit
  transaction for this booking" and trusted the webhook's own `amount`
  and `booking_id` metadata. It now:
  1. Looks up the transaction strictly by `(payment_provider,
     provider_reference = <checkout session id>)` — the session
     reference we ourselves stored via `attach_payment_session`. The
     booking id is *derived* from that row, never taken from webhook
     metadata.
  2. Requires the captured amount to equal
     `ROUND(transaction.amount * 100)` exactly, compared in integer
     centavos (no float/rounding ambiguity).
  3. Requires the currency to match (case-insensitive).
  4. Raises before any write on any mismatch — the whole function body
     runs in one transaction, so a `RAISE EXCEPTION` guarantees zero
     partial writes; the booking is never marked paid on a failed
     reconciliation.
  5. Logs every mismatch to `audit_logs` as `payment.reconciliation_failed`
     via a PL/pgSQL exception handler (message text only — booking id,
     expected/actual amount, references; never raw provider payloads or
     card data) before re-raising, so the failure both surfaces to the
     caller and survives the rollback for investigation.
  Direct `payment.paid` webhook events (not scoped to a checkout
  session) carry no session reference to reconcile against, so they are
  intentionally **not** auto-confirmed — they're recorded `skipped` and
  logged for manual review rather than trusted on metadata alone.
- Webhook signature is HMAC-SHA256 over `timestamp.rawBody`, verified
  with `crypto.timingSafeEqual` against the **raw request body** —
  before any `JSON.parse` — so a malformed or tampered payload can never
  reach the parser under an invalid signature; unsigned/invalid requests
  get 401.
- Settlement RPCs are `REVOKE`d from `PUBLIC` and granted only to
  `service_role`; the service client (`src/lib/supabase/service.ts`) is
  imported only from server-only files (route handlers, service-role
  use-cases) — never from a `"use client"` component.
- All `SECURITY DEFINER` payment functions set `SET search_path = public`
  to prevent search-path hijacking.
- RLS on `refunds`/`invoices`/`receipts`: customer sees own, org members
  see their venues' documents, admins see all. `payment_webhook_events`
  is admin-only.
- Checkout amount always comes from the server-side transaction row —
  never from client input. The confirmed amount must additionally match
  what PayMongo actually captured (see reconciliation above).
- Every lifecycle step writes to `audit_logs`
  (`payment.started/confirmed/failed`, `payment.reconciliation_failed`,
  `invoice.issued`, `refund.requested/processing/succeeded/failed`).
- **Fixed 2026-07: `sb_secret_...` key wired into the public anon-key slot.**
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` was found holding a Supabase secret key
  (RLS-bypassing) instead of a publishable/anon key — since `NEXT_PUBLIC_*`
  is compiled into public client JS, this shipped the secret to every
  visitor's browser. `src/lib/supabase/client.ts` and `server.ts` now
  `throw` at construction time if this variable ever starts with
  `sb_secret_` again, so the mistake fails loudly in development instead
  of silently shipping.
- **Checkout session race (migration 042).** `start_booking_payment`
  locks the booking row, so two concurrent requests can never create two
  pending transactions — but they could still both create separate
  PayMongo checkout sessions for the one pending transaction and race to
  attach. `attach_payment_session` is now first-attach-wins: a session
  already attached is left as the canonical row instead of being
  overwritten by a losing concurrent request. `start-checkout.usecase.ts`
  passes `p_force: true` only when it has independently decided an
  existing session is stale (past a conservative 55-minute TTL — PayMongo
  does not publish a fixed session lifetime).

## Testing

`apps/web` uses Vitest (`pnpm test` / `pnpm test:watch`) for the payments
feature: money rounding (including float-precision edge cases), webhook
HMAC signature verification (valid/tampered/wrong-secret/malformed),
event normalization per PayMongo event type, webhook orchestration
(duplicate-claim handling, unreconcilable-event skip routing, RPC error
→ `failed` status mapping), and the gateway registry. These are unit
tests against mocked Supabase/fetch clients — they verify our TypeScript
orchestration, not Postgres's own enforcement of amount/currency/
reference reconciliation, which lives in SQL (`confirm_booking_payment`)
and is validated against the real database in manual/production testing.

## Responsive Behavior

Payment and confirmation pages keep the existing single-column mobile /
two-column desktop layout; document cards stack in the sidebar column.

## Future Scalability

- Maya/Stripe slot in via the registry (see Provider Abstraction).
- `payment_kind` supports `balance` payments later — issue a second
  invoice and reuse the same checkout flow.
- Partial refunds: `complete_booking_refund` already computes
  `partially_refunded` from the succeeded-refund total.
- Invoice/receipt PDFs can be generated into Supabase Storage from the
  numbered rows without schema changes.
