# Payout disbursements — PayMongo Treasury

Replaces the earlier disbursement implementation, which was written against
an assumed `POST /v1/disbursements` endpoint that does not exist. Every
endpoint and field below is taken from PayMongo's published Treasury /
Money Movement documentation.

## Verification status of every claim in this document

| Claim                                                                           | Status                             |
| ------------------------------------------------------------------------------- | ---------------------------------- |
| `POST /v2/batch_transfers` + full payload                                       | **Verified** in docs               |
| `GET /v2/transfers/{id}` + response                                             | **Verified** in docs               |
| `GET /v2/transfers` filters: `limit`, `after_id`, `before_id`, `description`    | **Verified** in docs               |
| `GET /v1/wallets/receiving_institutions?provider=` → `attributes.provider_code` | **Verified** in docs               |
| Statuses `pending` / `succeeded` / `failed`                                     | **Verified** in docs               |
| Providers `paymongo` / `instapay` / `pesonet`                                   | **Verified** in docs               |
| InstaPay ≤ PHP 50,000, PESONet ≤ PHP 10,000,000                                 | **Verified** in docs               |
| Test mode supported for disbursements                                           | **Verified** in docs               |
| Callback payload shape / event names                                            | **UNRESOLVED — not documented**    |
| Callback signature scheme                                                       | **UNRESOLVED — not documented**    |
| Idempotency key on transfer creation                                            | **UNRESOLVED — none documented**   |
| Insufficient-balance error code                                                 | **UNRESOLVED — no code confirmed** |

Everything marked UNRESOLVED is handled by a design that does not depend
on it. Nothing in this implementation asserts undocumented behaviour as
fact.

## Known gap — read before enabling

**The `callback_url` payload is undocumented.** PayMongo's Transfer V2
reference defines the field as notifying "the progress of the transfer via
HTTP call" but publishes neither the payload structure, the event names,
nor a signature scheme for money-movement callbacks.

Rather than reverse-engineer it, the callback handler **never parses the
body for status**. It scrapes any identifier it can find, then re-reads the
authoritative state from `GET /v2/transfers/{id}`. A forged callback can at
worst make us re-read our own transfer and reach the correct answer.

**Callback authenticity cannot be verified.** PayMongo documents an HMAC
scheme for its _payments_ webhooks, but publishes nothing equivalent for
money-movement callbacks. No signature check is implemented, because
inventing one would give false assurance. The design compensates: since
the body is never trusted, an attacker who forges a callback only causes
an authenticated re-read of our own transfer.

**No idempotency key is documented** for transfer creation. Duplicate
protection is therefore layered, with the database as the primary guard:

1. `begin_withdrawal_disbursement()` claims `approved → processing` and
   refuses any withdrawal that already carries a `provider_reference`. A
   second transfer for the same withdrawal is impossible at the SQL level.
2. As recovery after an uncertain failure, the service looks up
   `GET /v2/transfers?description=…` and matches exactly on
   `reference_number` (our withdrawal id). `description` is the only
   documented filter and we control its value.

If PayMongo later publishes the callback payload or an idempotency header,
both can be tightened — the current design is deliberately not dependent
on either.

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

## Withdrawal state machine

```
pending ──approve──> approved ──begin_withdrawal_disbursement──> processing
   │                    │                                            │
   │                    │                    POST /v2/batch_transfers │
   │                    │                                            │
   ├─cancel─> cancelled │                    succeeded ──> paid  (terminal)
   └─reject─> rejected  └─reject─> rejected  failed    ──> failed (terminal,
                                                            funds released)
                                             pending   ──> stays processing
                                             unknown /
                                             unresolvable ──> needs_review
                                                              (funds HELD)

needs_review ──resolve_withdrawal_review(admin + note)──> paid | failed
```

`paid` and `failed` are terminal and are only ever reached from verified
provider data. `pending` legitimately stays `processing` — the transfer is
genuinely in flight and the reconciliation sweep will resolve it.

### needs_review

A withdrawal whose outcome cannot be established. Reached from:

- an undocumented status value from the provider
- the confirmation lookup failing after a create failure
- the status read failing on a withdrawal that has a transfer id
- `settle_withdrawal_request` or `fail_withdrawal_request` erroring
- the reconciliation sweep throwing on that withdrawal

It **does not release the claimed payouts**. Releasing would assert the
money did not move, which is exactly what is unknown. The funds stay held
until `resolve_withdrawal_review()` is called by an admin, which requires a
note recording how the real outcome was confirmed with PayMongo.

Admins and the recipient are both notified; the admin notification is
`urgent`.

### Error handling

**No provider error is classified.** PayMongo publishes no machine-readable
error taxonomy for Treasury, so neither the HTTP status nor the message
text can be interpreted without asserting undocumented behaviour. In
particular there is **no confirmed code for an underfunded wallet**, and
the implementation does not match on message text to detect one — an
earlier version did, and that was removed.

The adapter therefore raises a small set of codes that describe _where_
the call stopped, never _why the provider refused_:

| Condition                     | Code                                |
| ----------------------------- | ----------------------------------- |
| Money-out switched off        | `DISBURSEMENT_NOT_ENABLED`          |
| Required config missing       | `DISBURSEMENT_NOT_CONFIGURED`       |
| 401 / 403                     | `DISBURSEMENT_AUTH_FAILED`          |
| Any other non-2xx             | `DISBURSEMENT_REQUEST_FAILED`       |
| Request timed out             | `DISBURSEMENT_PROVIDER_TIMEOUT`     |
| Host unreachable              | `DISBURSEMENT_PROVIDER_UNREACHABLE` |
| 2xx with no `data` envelope   | `DISBURSEMENT_PROVIDER_ERROR`       |
| Currency not PHP              | `UNSUPPORTED_CURRENCY`              |
| Transfer object without an id | `DISBURSEMENT_PROVIDER_ERROR`       |

**The service does not branch on any of them.** Every failure of
`createTransfer` — whatever its code — goes to the same resolver, which
asks the provider what actually happened:

| Provider answer               | Outcome                             |
| ----------------------------- | ----------------------------------- |
| A transfer exists             | adopt it, apply its real status     |
| Confirmed: no transfer exists | fail, release the claimed payouts   |
| Cannot determine              | `needs_review`, **funds stay held** |

Funds are released only on a positive statement from PayMongo that no
transfer was created. An unknown error is never assumed to mean "nothing
happened" — it takes the reconciliation / `needs_review` path.

### Reconciliation

`POST /api/payouts/reconcile` (shared secret, constant-time compare)
sweeps everything in `processing`:

- **with** a transfer id → re-read `GET /v2/transfers/{id}`
- **without** one → ask `GET /v2/transfers?description=…` whether a
  transfer exists. Only if the provider confirms none does the sweep
  release the funds.

This is what makes "never release on ambiguity" workable rather than a
permanent stuck state.

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

## The one-open-withdrawal rule

A recipient may not create a withdrawal while any earlier one is
`pending`, `approved`, `processing` or `needs_review`.

**Enforced in `request_withdrawal()`**, not in the client. `EarningsView`
mirrors the rule through `isOpenWithdrawalStatus()` so the UI can explain
the block before submitting, but the database refuses a second request
regardless of what any client believes.

`needs_review` counts as open. A withdrawal under review still holds its
claimed payouts and its real outcome is unknown — it may already have been
paid — so it is the worst possible moment to send more money. Terminal
states (`paid`, `failed`, `rejected`, `cancelled`) do not block.

## Resolving a needs_review withdrawal

Administrators see these on `/admin/withdrawals` with their own KPI count
and an orange badge reading **"Needs review"**, never "Failed".

The row offers two actions, deliberately phrased as statements of fact
about what PayMongo did:

- **Provider settled it** → withdrawal `paid`, claimed payouts `paid`
- **Provider did not send it** → withdrawal `failed`, payouts released

Both require a free-text note (minimum 10 characters) recording _how_ the
outcome was confirmed — a transfer id, a dashboard reference, a support
ticket. The note and the acting administrator are written to `audit_logs`
alongside the previous and new status.

### Administrator responsibilities

Do not resolve from the dashboard's appearance alone. Confirm the transfer
in PayMongo first — `GET /v2/transfers/{id}` if a transfer id was
recorded, otherwise the Wallets transaction history. Resolving as
"provider settled it" marks the payouts paid permanently; resolving as
"did not send it" returns the money to the recipient's available balance
where it can be withdrawn again. Getting it wrong either loses the money
or pays it twice.

### What may release funds

Funds return to the recipient's available balance in exactly three cases,
all requiring positive evidence:

1. PayMongo reports the transfer `failed`.
2. A confirmation lookup establishes **no transfer exists** for the
   withdrawal.
3. An administrator resolves a review as "provider did not send it", with
   a recorded note.

Never on a client request, a callback body, an undocumented error message,
an unknown provider status, a timeout, or a 5xx. All of those hold the
funds and route to reconciliation or `needs_review`.

All transition and fund-movement logic lives in
`resolve_withdrawal_review()`. The server action validates shape and
forwards; the UI decides nothing about payouts.

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
