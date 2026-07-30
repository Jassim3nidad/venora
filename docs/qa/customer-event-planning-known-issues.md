# Customer Event Planning Known Issues

Date: July 31, 2026

## Open Verification Gaps

### Live authenticated browser matrix is not complete

Status: Open verification gap

The automated action, repository, migration, and database contracts enforce customer-owned event plans. The remaining unverified area is a full browser-backed local Supabase account matrix:

- Customer A saved plan vs Customer B direct access denial.
- Venue owner direct private-plan access denial.
- Supplier direct private-plan access denial.
- Coordinator direct private-plan access denial.
- Authenticated autosave refresh against a real `event_plans` row.
- Autosave server failure and retry in a real browser session.

Impact:

- No confirmed product defect.
- Release confidence still depends on automated contracts until this browser matrix is run.

Next action:

- Run a dedicated local browser auth/RLS fixture pass before final production release.

### Registration return depends on email confirmation boundary

Status: Open verification gap

Anonymous save redirects to `/login?redirectTo=/plan-event` and stores pending-save state. The real registration email-confirmation return flow has not been completed in a browser session.

Impact:

- Login/registration handoff implementation is contract-covered.
- Registration return remains implemented but unverified through live email confirmation.

Next action:

- Use local SMTP/Mailpit or a seeded verified-account path to complete the registration callback test.

### 200% zoom and reduced-motion checks are not separately automated

Status: Open verification gap

Keyboard, focus, semantics, dialog behavior, and axe smoke checks passed. Dedicated 200% zoom and reduced-motion automation were not added in Phase 1.

Impact:

- No confirmed accessibility defect.
- Manual visual review is still recommended before release.

Next action:

- Add these checks to a later accessibility QA pass if required by release policy.

## Known Historical Environment Issue

### Local migration drift exists outside event planning

Status: Known historical local environment drift

The repository has historical migration drift unrelated to Customer Event Planning Phase 1. Task 21 did not repair unrelated migration history by design.

Impact:

- Event-planning migration and database contracts pass against the current migration files.
- Fresh local Supabase resets may still be affected by unrelated historical migration ordering or table drift.

Next action:

- Track and repair unrelated migration drift separately from the event-planning release task.

## Non-Blocking Warnings Observed In Prior QA

- Existing Next module-type warning for Tailwind config and package preset.
- Existing Next image warning for a seeded Supabase venue image resolving to a private IP during `/venues` handoff.
- Existing Next scroll-behavior warning during route transitions.

## Closed In Earlier Phase 1 QA

- Start Over dialog focus trap and Escape support.
- Summary edit return focus.
- Invalid nested PostgREST OR filter for venue type handoff.
- Total-event-budget accidentally mapping to venue pricing.
