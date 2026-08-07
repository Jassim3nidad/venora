# Payout disbursements — PayMongo Treasury

Replaces the earlier disbursement implementation, which was written against
an assumed `POST /v1/disbursements` endpoint that does not exist. Every
endpoint and field below is taken from PayMongo's published Treasury /
Money Movement documentation.

## Known gap — read before enabling

**The `callback_url` payload is undocumented.** PayMongo's Transfer V2
reference defines the field as notifying "the progress of the transfer via
HTTP call" but publishes neither the payload structure, the event names,
nor a signature scheme for money-movement callbacks.

Rather than reverse-engineer it, the callback handler **never parses the
body for status**. It scrapes any identifier it can find, then re-reads the
authoritative state from `GET /v2/transfers/{id}`. A forged callback can at
worst make us re-read our own transfer and reach the correct answer.

If PayMongo later publishes the payload, the handler can be tightened — but
the current design is deliberately not dependent on it.

## Architecture

```
Withdrawal approval  (admin, /admin/withdrawals)
        |
        v
dispatchWithdrawalAction        server action, permission-gated
        |
        v
DisbursementService             state machine, rail selection, encryption
        |
        v
PayMongoTreasuryAdapter         the only code that knows PayMongo's format
        |
        v
PayMongo Treasury API           v2 transfers, v1 institutions
```

Nothing above the adapter knows PayMongo's wire format. Swapping providers
means writing one new `DisbursementGateway` implementation.

## Endpoints used

| Purpose                | Method | Path                                           |
| ---------------------- | ------ | ---------------------------------------------- |
| Create a transfer      | POST   | `/v2/batch_transfers`                          |
| Authoritative status   | GET    | `/v2/transfers/{id}`                           |
| Institution / BIC list | GET    | `/v1/wallets/receiving_institutions?provider=` |

Auth is HTTP Basic with the secret key as username and an empty password.
Amounts are integers in centavos. The version split (transfers v2,
institutions v1) is PayMongo's own.

One transfer per batch: each withdrawal is independently approved and must
fail independently. Batching is for bulk payroll, which this is not.

## Files changed

**Added**

- `features/payouts/domain/gateways/disbursement-gateway.port.ts` — money-out port
- `features/payouts/domain/transfer-network.ts` — rail selection (pure)
- `features/payouts/infrastructure/paymongo/paymongo-treasury.adapter.ts` — adapter
- `features/payouts/application/disbursement.service.ts` — orchestration
- `app/api/webhooks/paymongo-treasury/route.ts` — callback receiver
- `app/api/payout-institutions/route.ts` — authenticated institution proxy
- `supabase/migrations/20260807120000_payout_institutions.sql`

**Removed**

- `features/payouts/application/use-cases/execute-disbursement.usecase.ts`
- `createDisbursement`, `CreateDisbursementParams`, `DisbursementResult`,
  `DisbursementMethod` from the payments port
- `createDisbursement` and the channel map from `paymongo.gateway.ts`
- `disbursement.succeeded` / `disbursement.failed` arms from the payments
  webhook union and use-case — those event names were guessed

**Modified**

- `payout.schema.ts`, `payout.types.ts`, `payout-actions.ts`, `queries.ts` —
  structured institution fields
- `PayoutAccountManager.tsx` — searchable institution picker
- `admin-withdrawal-actions.ts` — calls the service
- `.env.example`

## Database migration

`20260807120000_payout_institutions.sql`

Adds to `payout_accounts`: `institution_code` (the BIC sent as
`destination_account.bic`), `institution_name`, `network`, `account_type`.
Adds `batch_transfer_id` and `provider_reference_number` to
`withdrawal_requests`. Adds `attach_withdrawal_transfer()` (service_role).

**Data conversion.** Existing rows have no BIC and one cannot be derived —
institution names are ambiguous and a wrong code misroutes money
irreversibly. Those rows keep their data, copy `bank_name` into
`institution_name` for display, and **have their verification revoked** so
they must be re-entered. `bank_name` is retained, not dropped: it is the
only record of what was originally entered.

A CHECK constraint enforces the invariant that a verified account must
carry an institution code, so no future code path can verify a destination
that cannot be paid.

## Environment variables

| Variable                         | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `PAYMONGO_SECRET_KEY`            | Basic-auth username (existing)          |
| `PAYMONGO_DISBURSEMENTS_ENABLED` | Kill switch; `false` refuses cleanly    |
| `PAYMONGO_SOURCE_ACCOUNT_NUMBER` | Wallet account, `source_account.number` |
| `PAYMONGO_SOURCE_ACCOUNT_NAME`   | `source_account.name`                   |
| `PAYMONGO_SOURCE_ACCOUNT_BIC`    | `source_account.bic`                    |
| `PAYMONGO_CALLBACK_URL`          | Absolute URL of the callback route      |
| `PAYMONGO_TRANSFER_PURPOSE`      | `purpose` field, default `Disbursement` |
| `PAYMONGO_TRANSFER_NETWORK_MODE` | `auto` \| `instapay` \| `pesonet`       |

No value is hardcoded. Missing config is reported by name.

## Rail selection

Precedence: **mode → institution listing → amount.** The institution's own
listing outranks amount because an institution listed only under PESONet
cannot receive an InstaPay transfer at any size, so routing purely on
amount would guarantee rejection.

- InstaPay: real time, ≤ PHP 50,000
- PESONet: same/next banking day, ≤ PHP 10,000,000

## Status flow

```
approved --begin_withdrawal_disbursement--> processing
                                              |
                        POST /v2/batch_transfers
                                              |
              succeeded -> paid        failed -> failed (payouts released)
              pending   -> stays processing, awaits callback or sweep
```

A withdrawal is marked `paid` only on an explicit `succeeded`. An
unrecognised status is treated as `pending`, never as success.

Provider errors are split by whether the transfer may already exist:
timeouts and unreachable-host leave the withdrawal `processing` for
reconciliation; explicit rejections release the funds. Releasing on an
ambiguous error risks paying twice.

## Callback flow

```
PayMongo --POST--> /api/webhooks/paymongo-treasury
                        |
             scrape identifier (body NOT trusted)
                        |
             match withdrawal by id or provider_reference
                        |
             GET /v2/transfers/{id}   <-- authoritative
                        |
             settle | fail | leave in flight
```

Returns 503 when status cannot be confirmed, so PayMongo retries.

## Testing checklist

- [ ] Money Movement enabled in **test mode** (currently missing — the test
      account has no wallet)
- [ ] `GET /api/payout-institutions?network=instapay` returns a populated list
- [ ] Adding a payout account requires an institution; free text is impossible
- [ ] Editing an account's number or institution revokes verification
- [ ] An unverified account cannot be withdrawn against
- [ ] Withdrawal ≤ PHP 50,000 routes to InstaPay; > 50,000 to PESONet
- [ ] `PAYMONGO_TRANSFER_NETWORK_MODE=pesonet` pins every transfer
- [ ] Amount > PHP 10,000,000 is rejected before any API call
- [ ] Dispatch with `PAYMONGO_DISBURSEMENTS_ENABLED=false` fails and releases funds
- [ ] Dispatch with a missing source var names the missing variable
- [ ] Successful transfer marks the withdrawal `paid` and its payouts `paid`
- [ ] Failed transfer releases payouts back to available
- [ ] Pending transfer leaves the withdrawal in flight
- [ ] Callback with a garbage body is acknowledged, changes nothing
- [ ] Double-clicking Send payout creates exactly one transfer
- [ ] No account number appears in any log line

## Deployment checklist

- [ ] Apply `20260807120000_payout_institutions.sql`
- [ ] Verify: `SELECT count(*) FROM payout_accounts WHERE verified_at IS NOT NULL AND institution_code IS NULL;` → 0
- [ ] Tell existing payout-account holders to re-add their account
- [ ] Set the six new env vars in Vercel (Production + Preview)
- [ ] Register `PAYMONGO_CALLBACK_URL` as publicly reachable
- [ ] Enable InstaPay/PESONet on the PayMongo Wallet
- [ ] Fund the wallet — transfers draw from its balance
- [ ] Leave `PAYMONGO_DISBURSEMENTS_ENABLED=false` until a test-mode
      transfer has settled end to end
- [ ] Flip to `true` in production only after that

## Sources

- <https://docs.paymongo.com/docs/money-movement-moving-money-with-api>
- <https://docs.paymongo.com/docs/money-movement-disbursements>
- <https://docs.paymongo.com/reference/transfer-resource>
- <https://docs.paymongo.com/reference/get-transfer>
- <https://docs.paymongo.com/reference/get-receiving-institutions>
