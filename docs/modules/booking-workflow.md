# Booking Workflow Module

## Folder Structure

- `apps/web/app/(customer)/venues/[slug]/book/page.tsx` - customer inquiry page.
- `apps/web/app/(customer)/bookings/page.tsx` - customer booking center.
- `apps/web/app/(customer)/bookings/[id]/page.tsx` - customer booking detail and timeline.
- `apps/web/app/(customer)/bookings/[id]/payment/page.tsx` - deposit payment start and transaction state.
- `apps/web/app/(customer)/bookings/[id]/confirmation/page.tsx` - confirmation or pending-payment state.
- `apps/web/app/(customer)/bookings/[id]/review/page.tsx` - post-event review.
- `apps/web/app/(venue-owner)/dashboard/bookings/page.tsx` - venue approval and completion queue.
- `apps/web/app/(venue-owner)/dashboard/bookings/[id]/page.tsx` - owner booking detail.
- `apps/web/app/api/bookings/*` - JSON API for create/list/status/payment.
- `apps/web/src/features/booking/application/actions.ts` - server actions over workflow RPCs.
- `apps/web/src/features/booking/ui/*` - workflow forms, action controls, badges.
- `supabase/migrations/018-021_*` - statuses, workflow columns, RPCs, notifications.

## Database Schema

Booking statuses:

`pending -> approved -> payment_pending -> confirmed -> completed -> reviewed`

Terminal exceptions:

`declined`, `cancelled`, `expired`

Booking columns added:

- `event_start_time`, `event_end_time`
- `approval_note`, `approved_at`
- `payment_due_at`, `payment_started_at`, `paid_at`
- `completed_at`, `reviewed_at`

Transaction columns added:

- `currency`, `payment_kind`, `checkout_url`
- `paid_at`, `failed_at`, `failure_reason`, `metadata`

Database RPCs:

- `create_booking_inquiry`
- `approve_booking_quote`
- `decline_booking_request`
- `cancel_booking_request`
- `start_booking_payment`
- `confirm_booking_payment`
- `fail_booking_payment`
- `complete_booking_event`

Triggers:

- `bookings_status_history` logs initial and changed statuses.
- `bookings_sync_availability` holds dates as tentative or reserved.
- `bookings_status_notifications` creates in-app notifications.
- `reviews_mark_booking_reviewed` marks completed bookings as reviewed.

## API Design

- `GET /api/bookings` returns current customer bookings.
- `POST /api/bookings` creates an inquiry.
- `PATCH /api/bookings/[id]/status` runs approve, decline, cancel, or complete.
- `POST /api/bookings/[id]/payment` starts a deposit transaction.
- `POST /api/webhooks/paymongo` confirms or fails payment from PayMongo.
- `POST /api/webhooks/maya` confirms or fails payment from Maya.

All APIs return:

```ts
{ data: T; error: null } | { data: null; error: { code: string; message: string; details?: unknown } }
```

## UI Pages

Customer:

- Select venue: existing `/venues` and `/venues/[slug]`.
- Choose date/package/submit inquiry: `/venues/[slug]/book`.
- Track workflow: `/bookings` and `/bookings/[id]`.
- Pay: `/bookings/[id]/payment`.
- Confirmation: `/bookings/[id]/confirmation`.
- Review: `/bookings/[id]/review`.

Venue owner:

- Approval queue: `/dashboard/bookings`.
- Booking detail: `/dashboard/bookings/[id]`.

## Validation

Zod schemas live in `booking.schema.ts`.

- Date-only validation avoids timezone drift.
- Guest count is numeric and positive.
- Approval validates deposit is not greater than total.
- Review ratings are constrained to 1-5.
- Payment provider is restricted to `paymongo`, `maya`, or `stripe`.

## Error Handling

Server actions map database errors to typed Venora errors:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `BOOKING_CONFLICT`
- `VENUE_NOT_APPROVED`
- `REVIEW_BOOKING_NOT_COMPLETED`
- `REVIEW_ALREADY_EXISTS`
- `VALIDATION_ERROR`

Forms show inline form-level errors and disable controls during pending states.

## Loading States

Client mutation controls use disabled buttons plus spinner icons. Server pages are force dynamic and render fully resolved booking data after auth checks.

## Empty States

- Customer booking center shows an empty CTA to browse venues.
- Owner booking dashboard shows an empty queue state.
- Payment and transaction panels show empty transaction states.

## Security

- Booking creation, approval, payment start, completion, and cancellation go through SECURITY DEFINER RPCs with explicit auth checks.
- Payment confirmation/failure RPCs are revoked from `anon` and `authenticated`, then granted to `service_role` for webhooks.
- RLS still protects table reads for bookings, transactions, notifications, and reviews.
- Venue owner access is checked through organization membership.
- Customer review eligibility is enforced by trigger and unique `booking_id`.
- **Fixed 2026-07: raw-update bypass of `approve_booking_quote`/`decline_booking_request`.**
  `approveBookingAction`/`declineBookingAction` (and the equivalent branch
  of `PATCH /api/bookings/[id]/status`) validated `totalAmount`/
  `depositAmount`/`reason` via Zod, then performed a raw
  `UPDATE bookings SET status = 'approved' | 'declined'` directly on the
  table instead of calling the RPC — silently discarding the validated
  amounts/reason. RLS's `admin_full_access_bookings` / `venue_org_manages_bookings`
  policies grant `FOR ALL` on bookings, so the raw write succeeded; the
  booking reached `approved` with `total_amount`, `deposit_amount`, and
  `approved_at` all `NULL`, and no invoice was ever issued
  (`issue_deposit_invoice` only fires when the RPC sets a positive
  `deposit_amount`). All three call sites now go through the RPCs.
  Migration 043 adds `bookings_approved_requires_valid_amounts`, a `CHECK`
  constraint that rejects `approved`-or-later status without a valid
  positive total/deposit and an `approved_at` timestamp — a database-level
  guard against any future code path making the same mistake — and adds
  the `booking.approved` audit log entry `approve_booking_quote` was
  missing.

## Responsive Behavior

- Customer pages use one-column mobile layouts and two-column desktop summaries.
- Owner dashboard cards stack on mobile and move actions into a right column on wide screens.
- Buttons keep stable heights and avoid layout shift during loading.

## Future Scalability

- Payment adapters can replace the current checkout URL handoff without changing UI state handling.
- `transactions.payment_kind` supports balances, refunds, and supplier fees.
- Status history supports dispute resolution and analytics.
- Notification triggers create in-app records now; Edge Functions can fan out to email, SMS, and push.
- Indexes on workflow status and transaction references support operations dashboards and webhook idempotency.
