# Payments and PayMongo

The payment domain uses a gateway abstraction, but PayMongo is the only
registered implementation. Maya has signature-verification scaffolding with
incomplete reconciliation. Stripe appears only in inactive configuration
examples. Neither is production-ready.

## Checkout and settlement

An approved booking carries positive total/deposit amounts and `approved_at`.
Starting checkout claims the booking, creates a payment attempt/session, moves
it to `payment_pending`, and calls PayMongo with booking metadata. The hosted
success URL is `/bookings/{id}/confirmation`; cancellation returns to
`/bookings/{id}/payment`. Both depend on the correct environment origin.

The browser return is informational. Only a signed PayMongo webhook can settle
the booking. Supported paid event types are `payment.paid` and
`checkout_session.payment.paid`.

## Webhook controls

1. Read the raw body and verify HMAC signature with the active endpoint secret.
2. Parse only after verification and recognize the event type.
3. Claim/store the provider event to make duplicate delivery idempotent.
4. Resolve trusted internal booking/payment references from stored metadata.
5. Reconcile exact expected amount, currency, provider reference, and current
   booking state.
6. Atomically mark payment paid, confirm the booking, snapshot commission,
   create receipt/invoice evidence, and write audit/notification effects.
7. Return an idempotent response for an already-applied valid event.

Late or out-of-order events must be evaluated against current state. Confirmed,
completed, or reviewed bookings are treated as already settled; invalid states,
references, amounts, or currencies must not be forced through.

## Records

| Record                  | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| Payment attempt/session | Gateway request, checkout ID/URL, status, failure context               |
| Webhook event           | Signature/claim/idempotency and processing evidence                     |
| Payment transaction     | Reconciled provider settlement for a booking                            |
| Invoice                 | Amount due; deposit invoice is created on approval by database behavior |
| Receipt                 | Immutable proof created after confirmed payment                         |
| Commission/snapshot     | Rule and amount captured at settlement time                             |
| Refund                  | Requested/provider/refunded state and reconciled amount                 |
| Audit log               | Actor/system event and resource metadata                                |

Do not log card data, credentials, full signatures, or unredacted provider
payloads containing personal data.

## Test and production configuration

Use PayMongo test-mode keys and a test webhook secret in local/preview. The
secret must match the exact registered endpoint. Production requires separate
server-only credentials, a public HTTPS webhook, correct app origin, provider
dashboard verification, and safe live smoke tests approved by finance/operations.
Passing mocked/unit tests does not prove live PayMongo behavior.

Refunds require an eligible settled payment, authorization, provider request,
status tracking, booking/cancellation coordination, commission impact, and audit
evidence. Never make a raw booking/payment row edit to “match” a dashboard.

## Incident routing

- [Checkout failure](runbooks/08-paymongo-checkout-failure.md)
- [Wrong return URL](runbooks/09-paymongo-return-url.md)
- [Signature failure](runbooks/10-paymongo-webhook-signature.md)
- [Duplicate](runbooks/11-duplicate-paymongo-webhook.md) or
  [late event](runbooks/12-late-paymongo-webhook.md)
- [Paid booking pending](runbooks/13-paid-booking-pending.md)
- [Missing receipt/invoice](runbooks/14-missing-payment-documents.md)
- [Refund mismatch](runbooks/15-refund-mismatch.md)

HTTP/event details are in [API webhooks](api/webhooks.md). Current limitations
include incomplete Maya reconciliation, externally unverified live behavior,
and environment-sensitive return URLs.
