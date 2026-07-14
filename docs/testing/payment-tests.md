# Payment Test Coverage

## Automated mocked coverage

```bash
pnpm test:payment
```

| Area                                               | Result                                                         |
| -------------------------------------------------- | -------------------------------------------------------------- |
| Checkout amount/currency/metadata                  | Covered                                                        |
| Success/cancel URL safety                          | Covered, including missing/non-HTTPS/localhost production host |
| PayMongo request/auth/error filtering              | Covered with mocked fetch                                      |
| Signature parsing and timing-safe comparison       | Covered: valid/invalid/missing/malformed/test/live             |
| `payment.paid` and `checkout_session.payment.paid` | Covered                                                        |
| Duplicate/out-of-order/late events                 | Idempotency and already-paid paths covered                     |
| Unknown/missing references                         | Ignored/manual-reconciliation path covered                     |
| Invoice/receipt/commission                         | SQL contract/static plus partial use-case assertions           |
| Refund mapping                                     | Covered; hosted row effects blocked                            |

## Remaining gaps

- No approved PayMongo test-mode checkout/webhook runtime was executed.
- Hosted reconciliation, invoice/receipt creation, audit rows, refund provider
  effects, and retry races need QA DB/provider credentials.
- Partial refunds are not claimed as implemented.
- Maya webhook signature exists, but complete reconciliation is not implemented;
  Maya must not be described as operational.

No live keys, real cards, real charges, or customer data are used.
