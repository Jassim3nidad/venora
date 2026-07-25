# End-to-End Scenario Inventory

Playwright configuration is `apps/web/playwright.config.ts`. It lists 153 cases
in 11 files. All runtime cases require a non-production app and deterministic
fixtures; `--list` success is not test success.

| ID  | Scenario                            | Current evidence                           | Status/gap             |
| --- | ----------------------------------- | ------------------------------------------ | ---------------------- |
| 1   | Register new customer               | No case                                    | MISSING                |
| 2   | Existing verified account registers | No case                                    | MISSING                |
| 3   | Unverified account resends          | No case                                    | MISSING                |
| 4   | Email confirmation fallback         | No case                                    | MISSING                |
| 5   | Login                               | Customer/venue/supplier/admin cases listed | BLOCKED runtime        |
| 6   | Logout                              | No explicit case                           | MISSING                |
| 7   | Forgot password                     | No case                                    | MISSING                |
| 8   | Reset password                      | No case                                    | MISSING                |
| 9   | Protected-route redirect            | Role denial cases listed                   | BLOCKED runtime        |
| 10  | Browse venues                       | Customer route access partial              | BLOCKED runtime        |
| 11  | Search/filter venues                | No interaction case                        | MISSING                |
| 12  | Open venue details                  | No identity assertion                      | MISSING                |
| 13  | Favorite venue                      | Route access only                          | MISSING mutation       |
| 14  | Submit booking inquiry              | No full browser case                       | MISSING                |
| 15  | View booking status                 | Customer route access                      | BLOCKED runtime        |
| 16  | Start payment                       | Mocked only                                | MISSING E2E            |
| 17  | Return from checkout                | No case                                    | MISSING                |
| 18  | View receipt/invoice                | No case                                    | MISSING                |
| 19  | Submit eligible review              | No case                                    | MISSING                |
| 20  | Attempt ineligible review           | No case                                    | MISSING                |
| 21  | View venue dashboard                | Venue role case listed                     | BLOCKED runtime        |
| 22  | Create/edit venue                   | Route access only                          | MISSING mutation       |
| 23  | Manage package                      | Route access only                          | MISSING mutation       |
| 24  | Manage availability                 | Route access only                          | MISSING mutation       |
| 25  | Approve inquiry                     | Mocked action only                         | MISSING E2E            |
| 26  | Reject inquiry                      | Mocked action only                         | MISSING E2E            |
| 27  | View analytics                      | Admin/route checks partial                 | BLOCKED runtime        |
| 28  | Export CSV                          | Unit output only                           | MISSING E2E            |
| 29  | Export PDF                          | Unit header only                           | MISSING E2E            |
| 30  | Upload venue verification           | Storage spec is placeholder                | OBSOLETE case; replace |
| 31  | View supplier dashboard             | Supplier role case listed                  | BLOCKED runtime        |
| 32  | Manage supplier profile/package     | Route access only                          | MISSING mutation       |
| 33  | View eligible inquiry               | Supplier access partial                    | BLOCKED runtime        |
| 34  | Hide ineligible event location      | Pure tests/static SQL                      | MISSING E2E            |
| 35  | View event snapshots                | Pure tests/static SQL                      | MISSING E2E            |
| 36  | Upload supplier verification        | Storage spec is placeholder                | OBSOLETE case; replace |
| 37  | Access admin overview               | Three tier suites listed                   | BLOCKED runtime        |
| 38  | Review venue-owner application      | Permission/API denial only                 | MISSING positive flow  |
| 39  | Review supplier application         | Permission/API denial only                 | MISSING positive flow  |
| 40  | Approve/reject application          | Permission/API denial only                 | MISSING positive flow  |
| 41  | Module-level permissions            | Extensive tier cases listed                | BLOCKED runtime        |
| 42  | Payment monitoring                  | Finance/super access partial               | BLOCKED runtime        |
| 43  | View audit logs                     | Tier access cases listed                   | BLOCKED runtime        |
| 44  | Access disputes case management     | Route + lifecycle actions                  | BLOCKED runtime        |
| 45  | Deny unauthorized admin module      | Extensive tier denial cases                | BLOCKED runtime        |
| 46  | Not-found route                     | No generic case; debug 404 unit only       | MISSING                |
| 47  | Safe server error fixture           | No case                                    | MISSING                |
| 48  | Empty dashboard                     | No deterministic empty fixture             | MISSING                |
| 49  | Permission-denied state             | Admin/customer role cases listed           | BLOCKED runtime        |
| 50  | Provider-unavailable state          | Mocked payment/AI only                     | MISSING E2E            |

## Existing skip audit

- Cross-tenant venue and supplier cases: SKIPPED WITH VALID REASON because seed
  lacks a second organization/supplier.
- Admin tier-dialog accessibility: SKIPPED WITH VALID REASON when no target
  administrator row exists.
- Notification/Storage suites: credential guard has a reason. Notification
  assertions are active; Storage assertions remain placeholders and must not be
  counted as meaningful passes.

Use synthetic accounts and controlled mailbox/provider test mode. Never depend
on real email delivery, customer data, or production state.
