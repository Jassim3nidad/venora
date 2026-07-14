# Flakiness and Reliability

## Audit

| Source                       | Finding                                                         | Action/status                                                            |
| ---------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Notification E2E             | Arbitrary 3 s/2 s sleeps, swallowed login failure, early return | Replaced with URL wait, polling, assertions, cleanup                     |
| Notification pipeline script | Fixed 2 s/5 s provider waits                                    | Keep BLOCKED/provider-only; replace when protocol offers status endpoint |
| Hosted role E2E              | Shared mutable QA accounts/data                                 | Serial CI worker; dedicated seeded environment still needed              |
| Cross-tenant tests           | Second venue org/supplier absent                                | Valid explicit skip; create deterministic fixtures                       |
| Admin dialog a11y            | No administrator row in some environments                       | Valid data-dependent skip; seed non-self admin                           |
| Dates                        | Several flows depend on current date                            | Unit rules deterministic; E2E clock control missing                      |
| Selectors                    | Some notification locators use text/button filtering            | Prefer role/name when UI contract is finalized                           |
| External network             | Supabase/provider/remote Deno import                            | Cache dependencies; isolate provider smoke                               |

No `.only` tests are permitted. Every `.skip` must carry an inline reason and be
inventoried. Playwright retries twice only in CI; retries are diagnostic, not a
substitute for deterministic setup.
