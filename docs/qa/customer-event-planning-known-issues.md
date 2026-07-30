# Customer Event Planning Known Issues

Date: July 31, 2026

## Open Issues

### Live authenticated browser matrix is not complete

Status: Open verification gap

The public `/plan-event` browser suite passes, and event-plan action/repository/migration tests cover ownership and RLS contracts. A full live browser matrix was not completed for:

- Customer A saved plan vs Customer B direct access denial.
- Venue owner direct private-plan access denial.
- Supplier direct private-plan access denial.
- Coordinator direct private-plan access denial.
- Authenticated autosave refresh against a real event_plans row.
- Autosave server failure and retry in a real browser session.

Impact:

- No confirmed product failure.
- Release confidence still depends on unit/action/repository/RLS contract coverage until a full local Supabase browser account matrix is executed.

Next action:

- Run a dedicated browser auth/RLS fixture pass in Task 21 or the release-validation phase.

### Registration return depends on email confirmation boundary

Status: Open verification gap

The anonymous login handoff to `/login?redirectTo=/plan-event` is browser-verified. The registration return flow was not fully completed through real email confirmation.

Impact:

- Login return is verified.
- Registration return remains implemented but unverified in browser.

Next action:

- Use local SMTP/Mailpit or a seeded verified test account path to complete the registration callback flow.

### Non-blocking venue image warning during handoff

Status: Existing unrelated warning

During `/venues` handoff, Next logged that one seeded Supabase venue image resolved to a private IP and could not be optimized.

Impact:

- Browser test still passed.
- Not caused by event-planning logic.

Next action:

- Review image host configuration or seeded image URL handling outside this Task 19-20 scope.

## Closed Issues In This Pass

- Start Over dialog focus trap and Escape support.
- Summary edit return focus.
- Invalid nested PostgREST OR filter for venue type handoff.
