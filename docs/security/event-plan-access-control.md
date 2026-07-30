# Event Plan Access Control

Date: July 31, 2026

## Data Boundary

Customer event plans are stored in `public.event_plans`.

Ownership field:

- `customer_id uuid not null references public.profiles(id) on delete cascade`

The customer id is assigned by server-side authenticated actions. Client components do not choose the owner id.

## Anonymous Access

Anonymous users can use `/plan-event`, but their plans remain in browser localStorage.

Anonymous users cannot create, read, update, or delete persisted `event_plans` rows.

Verified controls:

- Migration revokes table access from `public` and `anon`.
- Event-plan actions reject unauthenticated saves with a safe user-facing error.
- No questionnaire answers are placed in URLs during auth handoff.

## Authenticated Customer Access

Authenticated customers can access only their own event plans.

Repository methods require both:

- plan id or fingerprint
- authenticated customer id

Repository reads and writes are scoped with `customer_id`.

RLS policies enforce:

- Select: `auth.uid() = customer_id`
- Insert: `auth.uid() = customer_id`
- Update: `auth.uid() = customer_id`

## Duplicate-Save Protection

Anonymous-to-account save uses `source_draft_fingerprint`.

Behavior:

- The client stores a pending-save intent with the draft fingerprint before redirecting to login.
- After authentication, the draft is saved only if the fingerprint still matches.
- The database has a unique customer/fingerprint index for non-null fingerprints.
- If a duplicate insert race happens, the action attempts to return the existing matching plan for that customer.

## Role Access Matrix

| Actor | Intended access | Verification status |
| --- | --- | --- |
| Anonymous visitor | Public wizard only; no database access. | Verified by action tests and migration/database contracts. |
| Owning customer | Create, list, read, update, and archive own event plans. | Verified by action/repository contracts; live browser save still unverified. |
| Different customer | No access to another customer's event plans. | Implemented and contract-tested; live Customer A vs Customer B browser matrix unverified. |
| Venue owner | No access to private customer event plans. | Implemented and contract-tested through customer-only policy shape; live browser denial unverified. |
| Supplier | No access to private customer event plans. | Implemented and contract-tested through customer-only policy shape; live browser denial unverified. |
| Unassigned coordinator | No access to private customer event plans. | Implemented and contract-tested through customer-only policy shape; live browser denial unverified. |
| Admin | No Phase 1 customer event-plan dashboard access added. | Not applicable to Phase 1 UI; no broad public access granted. |

## Error Handling

Server actions hide raw Supabase and RLS errors from customers.

Customer-facing errors use safe messages such as:

- `Sign in to save your event plan.`
- `Unable to save event plan. Please try again.`
- `Event plan not found or access denied.`

## Service Role Boundary

Phase 1 does not use service-role keys in client components.

Event-plan persistence goes through server actions and Supabase server clients. Client-side role checks are not the security boundary.

## Historical Local Migration Drift

The repository has known historical local migration drift outside the event-planning implementation. Task 21 did not repair unrelated migration history. Event-planning database contracts passed against the current migration files, including the `event_plans` migration shape and RLS policy assertions.

## Remaining Verification Limitation

The live authenticated browser authorization matrix remains unverified:

- Customer A vs Customer B direct denial.
- Venue owner direct denial.
- Supplier direct denial.
- Coordinator direct denial.
- Registration email-confirmation return to `/plan-event`.
- Authenticated autosave against a live browser-created `event_plans` row.
