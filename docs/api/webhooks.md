# Payment Webhooks

## PayMongo

### Endpoint

`POST /api/webhooks/paymongo`

Headers:

- `Content-Type: application/json`
- `Paymongo-Signature: t=<unix>,te=<test-hmac>` in test mode or `li=<live-hmac>` in live mode.

The handler reads the raw request body before parsing. `PayMongoGateway.verifyWebhookSignature` extracts timestamp/signatures, rejects malformed or stale signatures, computes HMAC-SHA256 using `PAYMONGO_WEBHOOK_SECRET`, and compares with `timingSafeEqual`. Missing provider configuration returns `503`; invalid signature returns `401`.

Do not send test events to production and never expose `PAYMONGO_SECRET_KEY` or `PAYMONGO_WEBHOOK_SECRET`.

### Normalized event handling

| PayMongo event                             | Internal event      | Processing                                                                                                                                                                                 |
| ------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `checkout_session.payment.paid`            | `payment.succeeded` | Uses checkout session reference, payment ID, amount/currency, and Venora transaction metadata; calls hardened `confirm_booking_payment`                                                    |
| `payment.paid`                             | `payment.succeeded` | Resolves Venora transaction from trusted transaction ID or stored reference; rechecks amount, currency, booking, pending/deposit status, and stored checkout reference before confirmation |
| Payment failure variants parsed by gateway | `payment.failed`    | Finds booking by trusted metadata or stored transaction reference; calls `fail_booking_payment`                                                                                            |
| Refund paid/succeeded                      | `refund.succeeded`  | Calls `complete_booking_refund` by provider refund reference and reconciled amount                                                                                                         |
| Refund failed                              | `refund.failed`     | Calls `fail_booking_refund`                                                                                                                                                                |
| Unknown event                              | `ignored`           | Marks webhook event skipped; no booking/payment mutation                                                                                                                                   |

### Idempotency and ordering

1. Signature is verified.
2. Payload is normalized.
3. `claim_payment_webhook_event(provider,event_id,event_type,payload)` atomically inserts/claims the event.
4. An already claimed event returns `200` with `{"received":true,"result":"duplicate"}`.
5. Handler dispatches one payment/refund state transition.
6. `finish_payment_webhook_event` records `processed`, `failed`, or `skipped`.

Database row locks and transaction state checks prevent duplicate payment confirmation. A payment already settled becomes `skipped`. A late event lacking a safely reconcilable checkout reference is logged and skipped for manual reconciliation. Amount, currency, transaction, booking, and payment-kind mismatches never confirm the booking.

Failed processing returns `500`, allowing PayMongo retry. The event record retains failure context and the claim function permits the intended retry path. Repeated/out-of-order success after settlement is harmless. Out-of-order refund events require a correlated refund row/provider reference; otherwise processing fails and remains visible for reconciliation.

### Checkout creation and return-to-merchant

`POST /api/bookings/{id}/payment` and `startBookingPaymentAction` call `startCheckout`:

1. `start_booking_payment` locks the booking, validates customer/state/deposit, and creates or reuses a pending deposit transaction.
2. Existing provider sessions younger than 55 minutes are reused.
3. PayMongo checkout session uses PHP minor units and Venora transaction/booking metadata.
4. Success URL: `${appUrl}/bookings/{id}/confirmation`.
5. Cancel URL: `${appUrl}/bookings/{id}/payment`.
6. `attach_payment_session` is service-role-only and first-attach-wins. Concurrent calls converge on the database's canonical session.

Production rejects missing, malformed, non-HTTPS, localhost, and loopback application URLs before provider checkout creation.

Successful checkout creation response:

```json
{
  "data": {
    "bookingId": "00000000-0000-4000-8000-000000000001",
    "transactionId": "00000000-0000-4000-8000-000000000002",
    "amount": 30000,
    "provider": "paymongo",
    "checkoutUrl": "https://checkout.paymongo.com/example",
    "status": "pending"
  },
  "error": null
}
```

### Confirmation, invoice, receipt, commission, audit

`confirm_booking_payment` is the sole hardened settlement path. It correlates provider checkout/payment references, checks expected amount in minor units and currency, and refuses an unrelated or altered event. On successful settlement the database workflow:

- marks transaction paid and booking confirmed;
- writes payment/booking audit and status history;
- resolves and snapshots commission using venue > category > global precedence;
- creates the deposit receipt; deposit invoice is issued from the approval workflow;
- emits payment/booking notifications;
- preserves provider payload/event record for reconciliation.

Invoice and receipt numbers come from service-only sequence functions. `report_exports` is unrelated to payment audit; payment audit uses payment/webhook tables and `audit_logs`.

### Refund workflow

`POST /api/bookings/{id}/refund`:

1. Authenticated caller invokes `request_booking_refund`, which validates caller, cancelled/paid state, and refundable amount.
2. App calls PayMongo refund using captured payment reference.
3. `mark_refund_processing` stores provider refund reference.
4. Synchronous provider success can call `complete_booking_refund` immediately.
5. Later refund webhook confirms or fails the same correlated refund.
6. Completed refunds update booking/payment/refund state, audit trail, and notifications. Refunds cannot exceed paid eligible amount.

If no provider payment reference exists, refund remains pending for manual settlement rather than fabricating a provider refund.

### Reconciliation checklist

- Find `payment_webhook_events` by provider event ID and status.
- Find `transactions` by Venora transaction ID, checkout reference, payment reference, or metadata.
- Compare booking ID, amount, currency, `payment_kind=deposit`, and pending/paid status.
- Inspect `refunds`, `invoices`, `receipts`, commission snapshot, booking history, and `audit_logs`.
- Reprocess only through the trusted provider/webhook workflow; never manually call confirmation with unverified client values.
- A `skipped` event with `No checkout session reference; requires manual reconciliation` needs human review.

### Responses

| Condition                                                | Status/body                                  |
| -------------------------------------------------------- | -------------------------------------------- |
| Processed                                                | `200 {"received":true,"result":"processed"}` |
| Duplicate                                                | `200 {"received":true,"result":"duplicate"}` |
| Safely ignored/already settled/unreconcilable late event | `200 {"received":true,"result":"skipped"}`   |
| Invalid signature                                        | `401 {"error":"Invalid signature"}`          |
| Gateway not configured                                   | `503 {"error":"Provider not configured"}`    |
| Parse/DB/provider processing failure                     | `500 {"error":"Processing failed"}`          |

Rate limiting is not applied by Venora. PayMongo delivery behavior and hosting limits apply. Webhook payloads can contain personal/payment metadata; logs must not dump secrets or full sensitive bodies.

## Example PayMongo test delivery

Provider-generated signatures are required. This shape is illustrative only:

```json
{
  "data": {
    "id": "evt_test_example",
    "type": "event",
    "attributes": {
      "type": "checkout_session.payment.paid",
      "data": {
        "id": "cs_test_example",
        "type": "checkout_session",
        "attributes": {}
      }
    }
  }
}
```

Never manufacture a signature with a production secret in local scripts or documentation.
