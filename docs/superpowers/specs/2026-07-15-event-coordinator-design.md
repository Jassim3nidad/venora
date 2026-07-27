# Event Coordinator Role Design

## Goal

Implement Venora's event coordinator as a venue-side operational role with secure invitation-only access, explicit venue assignments, owner-selected permissions, and complete operational workflows. Coordinators may work across multiple assigned venues, but role membership alone never grants access to venue data or actions.

## Approved Delivery Strategy

Deliver the role in independently testable phases. Security foundations must land before coordinator UI actions are enabled.

1. Invitation, assignment, permission, authorization, and RLS foundation.
2. Venue-owner staff management and invitation acceptance.
3. Coordinator shell, navigation, venue switcher, and overview.
4. Assigned venues, bookings, calendar, customers, and messages.
5. Supplier coordination, tasks, event timelines, notifications, audit, and reports.
6. Responsive, accessibility, browser, authorization, and RLS verification.

No phase proceeds while its routes, authorization, migration, type-check, or focused tests are broken.

## Existing Foundation

Reuse these systems:

- `event_coordinator` in `public.user_role` and application role constants
- Single-role account model in `public.user_roles`
- `organizations` and `organization_members`
- Existing coordinator route group and `EnterpriseShell`
- Venue-owner venue forms and dashboard components
- `bookings`, booking status RPCs, status history, payments, and customer booking pages
- `venue_availability`, availability statuses, conflict trigger, and booking calendar UI
- `booking_messages` and booking conversation UI
- Supplier profiles, services, contact requests, quotes, messages, and booking supplier links
- Notification center, notification delivery infrastructure, and `audit_logs`
- Existing analytics queries and chart components

The current coordinator pages are scaffolding, not the authorization model. They use organization-wide owner helpers and must be migrated to coordinator-specific queries and guards.

## Account And Role Model

Venora currently enforces one row per user in `user_roles`. The coordinator implementation keeps that model.

- Public signup always creates a `customer` role.
- `event_coordinator` is removed from the public partner application flow.
- Coordinator access is granted only after accepting a valid venue-owner invitation.
- An existing `customer` may accept after an explicit warning that acceptance changes the account's primary role to `event_coordinator`.
- Existing `event_coordinator` accounts may accept additional venue assignments.
- Existing `venue_owner`, `supplier`, or `admin` accounts cannot be silently converted.
- Revocation removes venue access immediately but does not require deleting historical membership or changing the account role.
- A coordinator with no active assignments sees a safe no-assignment state.

The global role controls the coordinator dashboard entry point. Venue assignments and permissions control all data access and actions.

## Membership And Assignment Model

Keep `organization_members` as the organization-level staff relationship. Do not create a competing organization membership system.

Add venue-specific staff assignments:

### `venue_staff_assignments`

- `id uuid primary key`
- `organization_id uuid not null`
- `venue_id uuid not null`
- `user_id uuid not null`
- `staff_role text not null`, initially `event_coordinator`
- `permission_preset text not null`
- `permissions text[] not null`
- `status text not null`: `active`, `suspended`, or `revoked`
- `job_title text null`
- `invited_by uuid not null`
- `accepted_at timestamptz not null`
- `suspended_at timestamptz null`
- `revoked_at timestamptz null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Constraints ensure the venue belongs to the stated organization, permission keys are in the centralized allowlist, and only one non-revoked assignment exists per user and venue.

An invitation covering multiple venues creates one assignment per venue. Permissions are stored as the resolved set on each assignment, so authorization never trusts the preset label alone.

## Invitation Model

Add:

### `venue_staff_invitations`

- `id uuid primary key`
- `invited_email text not null`
- `staff_role text not null`
- `permission_preset text not null`
- `permissions text[] not null`
- `job_title text null`
- `token_hash text not null unique`
- `status text not null`: `pending`, `accepted`, `declined`, `expired`, or `revoked`
- `expires_at timestamptz not null`
- `invited_by uuid not null`
- `accepted_by uuid null`
- `accepted_at timestamptz null`
- `revoked_at timestamptz null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `venue_staff_invitation_venues`

- `invitation_id uuid not null`
- `venue_id uuid not null`
- Primary key on `(invitation_id, venue_id)`

The owner action generates a cryptographically random raw token server-side and stores only its SHA-256 hash. The raw token appears only in the invitation link. Invitations expire after seven days, are single-use, and may be revoked or resent.

Invitation delivery uses server-side Supabase Auth email functionality. New users receive an authentication invitation; existing users receive a secure sign-in link to the same acceptance route. The acceptance action requires an authenticated user, verifies the current auth email against the normalized invited email, validates every invited venue still belongs to the inviter, and performs role conversion plus assignment creation atomically.

Raw tokens, token hashes, service-role keys, and auth session data are never returned to browser components or audit metadata.

## Coordinator Permissions

Centralize permission keys in TypeScript and SQL. Store only validated keys.

Venue:

- `venue.view`
- `venue.edit_content`
- `venue.manage_media`
- `venue.manage_packages`

Bookings:

- `booking.view`
- `booking.respond`
- `booking.approve`
- `booking.decline`
- `booking.assign_coordinator`
- `booking.add_internal_notes`

Calendar:

- `calendar.view`
- `calendar.manage`
- `calendar.manage_blackouts`
- `calendar.manage_maintenance`

Communication:

- `message.view`
- `message.send`

Suppliers:

- `supplier.view`
- `supplier.recommend`
- `supplier.coordinate`

Tasks:

- `task.view`
- `task.create`
- `task.update`
- `task.assign`
- `task.complete`

Reports:

- `report.view_operations`
- `report.view_limited_financials`

Implement the requested Booking Coordinator, Operations Coordinator, Content Coordinator, Read-Only Coordinator, and Venue Manager presets. Owner-submitted custom permissions are intersected with the server allowlist. Owner-only, payout, commission, ownership-transfer, venue-deletion, admin, role-management, and refund powers are never coordinator permissions.

## Authorization Architecture

Create coordinator-specific server helpers:

- `requireCoordinatorUser()`
- `getCoordinatorAssignments(userId)`
- `requireVenueAssignment(venueId)`
- `requireVenuePermission(venueId, permission)`
- `requireBookingPermission(bookingId, permission)`
- `requireConversationPermission(conversationId, permission)`
- `requireTaskPermission(taskId, permission)`

Record-scoped helpers receive a record identifier, load the target server-side, derive its `venue_id`, then check active assignment and permission. Client-submitted user IDs, roles, permissions, owner IDs, or venue IDs never establish authorization.

Server Components use the same helpers for data scope and UI visibility. Server Actions and Route Handlers repeat the authoritative checks before mutation. Client checks only improve presentation.

## RLS Strategy

Create non-exposed security helper functions for assignment and permission checks where possible. Callable mutation RPCs remain narrowly exposed, explicitly validate `auth.uid()`, set a safe `search_path`, revoke default `PUBLIC` execution, and grant only required roles.

Replace coordinator access through broad `is_org_member_for_venue()` policies. Preserve venue-owner and admin behavior while adding assignment-aware coordinator policies.

Policy rules:

- Owners manage venues they own.
- Admins retain existing trusted access.
- Legacy non-coordinator staff behavior is preserved unless a policy must be tightened for sensitive data.
- Coordinators read only records belonging to actively assigned venues and only with the relevant view permission.
- Coordinator writes require both an active assignment and the exact mutation permission.
- Coordinators cannot insert, update, reactivate, or delete their own assignments or permissions.
- Payouts, bank data, owner tax data, commissions, refunds, and platform analytics remain unavailable.
- Invitation rows are readable and mutable only by owning venue owners, trusted admins, or the matching invitee through the acceptance operation.
- Tasks, timelines, internal notes, and assignment history are never public.

All new exposed tables enable RLS and receive explicit grants appropriate to their operations. Indexes support assignment lookup by user, venue, status, permission scope, invitation token hash, invitation email, task filters, and timeline date queries.

## Booking And Communication Safety

Reuse existing bookings and status values. Do not add coordinator-specific bookings or alternate status names.

- Booking list and details query only assigned venues.
- Existing approval, decline, cancellation, completion, and message actions are wrapped or refactored to require coordinator permissions.
- Existing database RPCs are tightened so organization membership alone cannot approve, decline, cancel as venue staff, or complete bookings.
- Status transitions remain the existing database workflow.
- Approval and decline remain atomic and continue creating history, availability updates, invoices, and notifications.
- Coordinators without final-decision permission receive a real owner-review request workflow rather than owner controls.
- Booking messages add coordinator as an allowed operational sender while retaining the customer-facing venue-team presentation.
- Internal notes are stored separately from customer-visible messages.
- Revoked or suspended assignments fail both application checks and RLS immediately.

## Calendar Design

Reuse `venue_availability`, `BookingCalendar`, active booking status rules, and database conflict protection.

- Coordinators see assigned venues only.
- `calendar.view` permits reading.
- `calendar.manage`, `calendar.manage_blackouts`, and `calendar.manage_maintenance` gate corresponding mutations.
- Tentative and reserved values continue to project pending and confirmed booking activity.
- Existing maintenance and blackout values are reused.
- Setup, cleanup, and inspection entries come from the event timeline rather than inventing availability statuses.
- Conflict checks remain server-side and database-enforced.
- Owner and customer venue/calendar routes are revalidated after changes.

## Operational Data

Add focused tables only for missing domains:

### `booking_internal_notes`

Venue-scoped, booking-linked, append-oriented internal notes with author and timestamps. Customers and suppliers cannot read them.

### `booking_tasks`

Booking-linked operational tasks using statuses `todo`, `in_progress`, `blocked`, `completed`, and `cancelled`, and priorities `low`, `normal`, `high`, and `urgent`.

### `booking_timeline_entries`

Booking-linked event-day schedule entries with start/end time, assigned coordinator or linked supplier, status, ordering, and overlap validation.

Extend `booking_suppliers` only where required for coordination status, arrival time, setup time, and internal notes. Reuse existing supplier inquiry, proposal, quote, and message statuses.

## Routes And Navigation

Canonical coordinator navigation:

1. Overview - `/dashboard/coordinator`
2. My Venues - `/dashboard/coordinator/venues`
3. Bookings - `/dashboard/coordinator/bookings`
4. Calendar - `/dashboard/coordinator/calendar`
5. Customers - `/dashboard/coordinator/customers`
6. Messages - `/dashboard/coordinator/messages`
7. Suppliers - `/dashboard/coordinator/suppliers`
8. Tasks - `/dashboard/coordinator/tasks`
9. Reports - `/dashboard/coordinator/reports`

Add venue, booking, and conversation detail routes required by the product specification. Existing `/dashboard/coordinator/events` links redirect to the canonical bookings routes for compatibility. Navigation is filtered server-side using the resolved permissions supplied to `EnterpriseShell`.

The venue switcher uses `?venue=<venueId>`, validates the selected venue server-side, supports all assigned venues, and safely falls back when the identifier is missing or unauthorized.

## Dashboard Workflows

Overview uses real assigned-venue data for booking requests, upcoming events, unread messages, due tasks, calendar conflicts, and supplier actions. Quick actions appear only when their routes and permissions are available.

My Venues reuses venue-owner presentation and edit sections, but each section receives coordinator permissions and each underlying action performs a server-side permission check. Ownership, payout, commission, legal, transfer, and deletion controls never render.

Bookings provide real status, date, event type, customer, payment-state, and coordinator filters. Details include customer request snapshots, status history, customer conversation, internal notes, tasks, suppliers, and event timeline.

Customers are derived only from bookings at assigned venues. Messages are booking-scoped conversations, never a global customer directory or unrestricted chat.

Supplier coordination reuses accredited supplier discovery and existing inquiry/proposal records. Coordinators recommend, link accepted engagements, and record operational details, but cannot accept paid proposals for customers.

Reports default to operational metrics. Booking amounts appear only with `report.view_limited_financials`; payout, bank, tax, commission, and marketplace-wide data never appear.

## Notifications And Audit

Reuse the existing notification center and audit infrastructure.

Invitation, assignment, permission, booking, message, calendar, supplier, task, and timeline actions emit scoped notifications and audit entries. Notification failure is best-effort and never rolls back a successful core transaction. Audit metadata excludes secrets, raw tokens, credentials, and full session data.

Booking notifications target active assigned coordinators whose permissions make the notification actionable. Links resolve to coordinator routes and never reveal unassigned records.

## UI And Responsive Behavior

Retain the enterprise dashboard visual system.

- Desktop uses the existing persistent sidebar, top bar, venue switcher, tables, and multi-column operational panels.
- Tablet uses the existing collapsible navigation with two-column content where practical.
- Mobile prioritizes today's event, next timeline item, overdue tasks, messages, supplier arrival, internal notes, and booking access.
- Tables become readable cards or contained scrolling regions.
- Dialogs fit the viewport, focus is managed, and sticky controls never cover content.
- Every status includes text, every icon control has a label, and navigation exposes active state to assistive technology.
- Every route includes loading, empty, error, unauthorized, no-assignment, suspended, and revoked states as applicable.

## Testing Strategy

Use existing Vitest and Playwright infrastructure. Do not install dependencies.

Automated coverage includes:

- Permission preset resolution and custom permission validation
- Public coordinator application rejection
- Invitation token hashing, expiry, revocation, reuse, and email matching
- Customer-to-coordinator conversion confirmation
- Privileged account conversion rejection
- Owner venue ownership validation when inviting or changing assignments
- Assignment status and venue isolation
- Read-only coordinator mutation rejection
- Booking, message, calendar, supplier, task, timeline, and report IDOR checks
- RLS checks for direct table/RPC access
- Existing booking transition and availability behavior

Browser verification covers every coordinator route at desktop, tablet, and mobile widths using safe development accounts for full, limited, read-only, unassigned, suspended, revoked, owner, customer, supplier, and admin states.

## Migration And Rollout

Create migrations through the Supabase CLI once the local Supabase runtime is available. Do not apply automatically to production.

1. Add assignment, invitation, task, timeline, and internal-note structures.
2. Add constraints, indexes, grants, RLS, and helper functions.
3. Tighten existing organization-member policies and booking RPC authorization.
4. Backfill existing coordinator organization members only when an unambiguous venue assignment can be derived; otherwise leave them inactive and require owner assignment.
5. Regenerate database types with the repository command.
6. Run database advisors, migration-order checks, RLS tests, and rollback review.

The migration must not grant old coordinator rows automatic access to every venue in an organization.

## Known Baseline Blockers

- Local Supabase cannot currently start because Docker's Linux engine and WSL are unavailable.
- The current repository type-check and production build fail at `apps/web/src/components/layout/MarketplaceLayout.tsx:33` due to `exactOptionalPropertyTypes`.
- The generated database types are hand-maintained and must be regenerated when a local or approved development database becomes available.

These blockers must be separated from coordinator regressions. The unrelated marketplace type error should be fixed as a small prerequisite only with explicit authorization or as a narrowly documented build-enabling change.

## Out Of Scope

- Multiple simultaneous primary account roles
- Coordinator venue ownership, deletion, payout, commission, tax, bank, refund, or admin powers
- Unrestricted global customer or supplier messaging
- A second booking, calendar, supplier inquiry, notification, or audit system
- New calendar, chart, PDF, messaging, or testing dependencies
- Production migration application or production-data testing
