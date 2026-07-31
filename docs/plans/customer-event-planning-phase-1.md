# Customer Event Planning Phase 1 Implementation Plan

> This plan implements a deterministic guided event-planning questionnaire
> that anonymous users can complete and authenticated customers can save.
> It remains separate from the existing authenticated AI event planner.

**Goal:** Build a public multi-step customer journey that collects structured
event preferences, creates an Event Plan Summary, safely persists anonymous
drafts, saves authenticated plans, and maps supported criteria into venue
search.

**Architecture:** Implement the feature as a separate event-planning domain
under `src/features/event-planning`. The public `/plan-event` route will use a
client-side wizard backed by validated domain state. Anonymous drafts remain
in versioned localStorage. Authenticated plans persist through server-side
actions and a private Supabase table protected by customer-only RLS.

**Tech stack:** Next.js, React, TypeScript, React Hook Form, Zod, Supabase,
Tailwind CSS, existing Venora UI components, existing pnpm test framework.

## Global Constraints

- Keep `/account/event-planner` unchanged.
- Do not replace the AI planner.
- Do not add package dependencies.
- Do not modify `package.json`.
- Do not modify `pnpm-lock.yaml`.
- Do not create fake AI recommendations.
- Do not create numeric match percentages.
- Do not create fake venue availability.
- Do not create fake supplier availability.
- Do not place questionnaire answers in URLs.
- Do not expose event plans publicly.
- Do not allow anonymous database access.
- Do not duplicate lookup data.
- Do not use client-side role checks as the security boundary.
- Use server-side validation.
- Use customer-only RLS.
- Keep service-role operations server-only.
- Map only supported answers into venue search.
- Preserve unsupported criteria in the event plan.
- Use Philippine peso formatting for budget values.
- Follow the existing project architecture and naming conventions.

## 1. Architecture Decisions

### Route

Create `apps/web/app/(customer)/plan-event/page.tsx`.

The public URL is `/plan-event`. The `(customer)` route group does not appear in the URL.

Add `loading.tsx` and `error.tsx` in the same route folder so the page has stable loading and error states without changing global customer layout behavior.

### Separation From AI Planner

`/plan-event` is deterministic. It collects structured answers, validates them, persists anonymous drafts locally, and saves authenticated plans through server actions. It makes no AI requests and displays no AI labels.

`/account/event-planner` remains AI-assisted and authenticated. It should not be moved, renamed, reused, or modified by Phase 1. Future AI work may read saved event plans through a separate, explicitly authorized integration.

### Feature Module

Create `apps/web/src/features/event-planning/` with focused subfolders:

- `domain`: TypeScript types and constants.
- `schemas`: Zod schemas for draft, steps, persistence, and mapping.
- `utils`: pure utilities for draft storage, title generation, and search mapping.
- `application`: server actions.
- `infrastructure`: Supabase repository.
- `components`: wizard, step UI, summary, save status, and dialogs.

## 2. File Map

| File | Action | Responsibility | Dependencies | Public exports | Tests |
| --- | --- | --- | --- | --- | --- |
| `apps/web/app/(customer)/plan-event/page.tsx` | Create | Server route that renders the wizard shell and passes lookup data | event-planning components, lookup queries | default page | Browser tests |
| `apps/web/app/(customer)/plan-event/loading.tsx` | Create | Skeleton matching wizard layout | Tailwind | default loading | Browser visual check |
| `apps/web/app/(customer)/plan-event/error.tsx` | Create | Route error recovery UI | React client error boundary pattern | default error component | Browser error check |
| `apps/web/src/features/event-planning/domain/event-plan.types.ts` | Create | Draft, persisted plan, enums, action result types | none | all event-planning types | `event-plan.schema.test.ts` |
| `apps/web/src/features/event-planning/domain/event-plan.constants.ts` | Create | Step IDs, localStorage key, draft version, allowed values, payment options | types, lookup mapping | constants and option arrays | constants covered by schema tests |
| `apps/web/src/features/event-planning/schemas/event-plan.schema.ts` | Create | Zod schemas for draft, steps, persistence, restoration, and mapper | zod, constants, location helpers | schemas and parse helpers | `event-plan.schema.test.ts` |
| `apps/web/src/features/event-planning/utils/event-plan-draft.ts` | Create | SSR-safe versioned localStorage draft utilities | schemas, types | `loadEventPlanDraft`, `saveEventPlanDraft`, `clearEventPlanDraft`, `migrateEventPlanDraft`, `isEventPlanDraftExpired` | `event-plan-draft.test.ts` |
| `apps/web/src/features/event-planning/utils/event-plan-title.ts` | Create | Default title generation | types | `generateEventPlanTitle` | `event-plan-title.test.ts` |
| `apps/web/src/features/event-planning/utils/event-plan-search-mapper.ts` | Create | Pure mapper from plan to allowlisted venue search params | schemas, venue search param names | `mapEventPlanToVenueSearchParams` | `event-plan-search-mapper.test.ts` |
| `apps/web/src/features/event-planning/application/event-plan.actions.ts` | Create | Server actions for create, update, archive, get, list, and handoff save | repository, schemas, Supabase server client | action functions | action/repository tests |
| `apps/web/src/features/event-planning/infrastructure/event-plan.repository.ts` | Create | Supabase data access scoped by customer ID | Supabase server client, types | repository factory and methods | repository tests |
| `apps/web/src/features/event-planning/components/EventPlanningWizard.tsx` | Create | Client state machine and step orchestration | draft utils, schemas, step components | `EventPlanningWizard` | Browser tests |
| `apps/web/src/features/event-planning/components/EventPlanningProgress.tsx` | Create | Progress indicator and step labels | constants | `EventPlanningProgress` | component/browser tests |
| `apps/web/src/features/event-planning/components/EventBasicsStep.tsx` | Create | Step 1 form | React Hook Form, Zod resolver | `EventBasicsStep` | step validation tests |
| `apps/web/src/features/event-planning/components/DateLocationStep.tsx` | Create | Step 2 form | location helpers, schemas | `DateLocationStep` | step validation tests |
| `apps/web/src/features/event-planning/components/GuestsBudgetStep.tsx` | Create | Step 3 form | peso formatting, schemas | `GuestsBudgetStep` | step validation tests |
| `apps/web/src/features/event-planning/components/VenueStyleStep.tsx` | Create | Step 4 form | constants, schemas | `VenueStyleStep` | step validation tests |
| `apps/web/src/features/event-planning/components/RequirementsStep.tsx` | Create | Step 5 form | amenity options, schemas | `RequirementsStep` | step validation tests |
| `apps/web/src/features/event-planning/components/ServicesStep.tsx` | Create | Step 6 form | supplier categories, schemas | `ServicesStep` | step validation tests |
| `apps/web/src/features/event-planning/components/BookingPreferencesStep.tsx` | Create | Step 7 form | payment and booking constants | `BookingPreferencesStep` | step validation tests |
| `apps/web/src/features/event-planning/components/EventPlanSummary.tsx` | Create | Summary sections and actions | title/search mapper, types | `EventPlanSummary` | browser and unit tests |
| `apps/web/src/features/event-planning/components/EventPlanSaveStatus.tsx` | Create | Accessible local/server save state | types | `EventPlanSaveStatus` | component/browser tests |
| `apps/web/src/features/event-planning/components/StartOverDialog.tsx` | Create | Confirm destructive draft clear | existing dialog style | `StartOverDialog` | browser tests |
| `supabase/migrations/<timestamp>_create_event_plans.sql` | Create in Task 4 only | Event-plan table, constraints, grants, and RLS | Supabase CLI migration command | SQL migration | RLS tests |
| `apps/web/app/(marketing)/page.tsx` | Modify in Task 18 | Add planning CTA while preserving browse venues CTA | existing landing components | none | browser tests |

## 3. Domain Model

Use explicit `null` for unanswered values. Avoid optional fields except for object properties that are genuinely absent from API responses.

```ts
export type EventPlanningStep =
  | "event-basics"
  | "date-location"
  | "guests-budget"
  | "venue-style"
  | "requirements"
  | "services"
  | "booking-preferences"
  | "summary";

export type EventType =
  | "wedding"
  | "birthday"
  | "corporate"
  | "debut"
  | "graduation"
  | "reunion"
  | "conference"
  | "seminar"
  | "product-launch"
  | "other";

export type DatePreferenceType =
  | "exact"
  | "range"
  | "month"
  | "flexible"
  | "not-sure";

export type GuestCountRange =
  | "under-50"
  | "50-100"
  | "101-150"
  | "151-200"
  | "201-300"
  | "over-300"
  | "not-sure";

export type BudgetPreference =
  | "under-50000"
  | "50000-100000"
  | "100001-250000"
  | "250001-500000"
  | "above-500000"
  | "not-sure"
  | "prefer-not-to-say"
  | "custom";

export type VenueSettingPreference = "indoor" | "outdoor" | "both" | "no-preference";

export type PriorityFactor =
  | "location"
  | "budget"
  | "appearance"
  | "capacity"
  | "complete-package"
  | "accessibility"
  | "parking"
  | "accredited-suppliers"
  | "reviews"
  | "flexible-payment"
  | "accommodation"
  | "privacy";

export type AmenityRequirement =
  | "parking"
  | "air-conditioning"
  | "accessible-entrance"
  | "accessible-restroom"
  | "preparation-room"
  | "stage"
  | "sound-system"
  | "lighting"
  | "kitchen"
  | "catering-prep"
  | "accommodation"
  | "ceremony-area"
  | "reception-area"
  | "backup-indoor-space"
  | "wifi"
  | "generator"
  | "pet-friendly"
  | "none";

export type ServiceCategory =
  | "catering"
  | "photography"
  | "videography"
  | "event-coordination"
  | "styling"
  | "lights-sounds"
  | "host-emcee"
  | "entertainment"
  | "cake-desserts"
  | "hair-makeup"
  | "transportation"
  | "photo-booth"
  | "other"
  | "already-have-all";

export type ServiceSelectionMode = "needs-services" | "already-complete";
export type PackagePreference = "complete-package" | "individual-services" | "compare-both" | "not-sure";
export type AccreditedSupplierPreference = "yes" | "no" | "maybe" | "already-have-preferred";
export type PaymentPreference = "deposit-balance" | "full-payment" | "no-preference";
export type BookingUrgency = "asap" | "within-1-month" | "within-1-3-months" | "over-3-months" | "exploring";
export type DecisionMakerType = "self" | "partner-family" | "company-organization" | "event-coordinator" | "other";
export type EventPlanStatus = "draft" | "completed" | "archived" | "converted_to_inquiry" | "converted_to_booking";

export type EventPlanDraft = {
  schemaVersion: 1;
  currentStep: EventPlanningStep;
  eventType: EventType | null;
  customEventType: string | null;
  datePreferenceType: DatePreferenceType | null;
  exactDate: string | null;
  preferredDateStart: string | null;
  preferredDateEnd: string | null;
  preferredMonth: number | null;
  preferredYear: number | null;
  preferredDayOfWeek: string | null;
  preferredTimeOfDay: string | null;
  preferredProvince: string | null;
  preferredCity: string | null;
  nearbyLocationsAllowed: boolean | null;
  expectedGuestCount: number | null;
  guestCountRange: GuestCountRange | null;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetPreference: BudgetPreference | null;
  currency: "PHP";
  venueStyles: string[];
  settingPreference: VenueSettingPreference | null;
  rankedPriorities: PriorityFactor[];
  requiredAmenities: AmenityRequirement[];
  additionalRequirements: string | null;
  servicesNeeded: ServiceCategory[];
  customService: string | null;
  serviceSelectionMode: ServiceSelectionMode;
  packagePreference: PackagePreference | null;
  accreditedSupplierPreference: AccreditedSupplierPreference | null;
  paymentPreference: PaymentPreference | null;
  bookingUrgency: BookingUrgency | null;
  decisionMakerType: DecisionMakerType | null;
  completedSteps: EventPlanningStep[];
  updatedAt: string;
};
```

## 4. Questionnaire Steps

### 1. Event Basics

- Questions: event type; custom event type when `other` is selected.
- Required: `eventType`.
- Optional: `customEventType` only when `eventType !== "other"`.
- Conditional: `customEventType` required for `other`.
- Validation: trim custom value, minimum 2 characters, maximum 80 characters, no HTML rendering.
- Back behavior: preserve all answers.
- Skip behavior: no skip because event type is core.
- Dependencies: changing away from `other` clears `customEventType` after confirmation.
- Draft writes: `eventType`, `customEventType`, `completedSteps`.
- Accessibility: use `fieldset`, `legend`, radio buttons, visible error below custom input.

### 2. Date and Location

- Questions: date preference type; date fields; preferred province/city; nearby locations.
- Required: `datePreferenceType`.
- Optional: location may be "not sure" by leaving province and city null.
- Conditional: exact date, date range, preferred month/year, or flexible preferences.
- Validation: no past exact dates, date range end not before start, month is 1-12, year is current year or later, city belongs to province.
- Back behavior: preserve selected date mode and location.
- Skip behavior: province/city can be skipped; date mode cannot.
- Dependencies: changing date mode clears incompatible date fields after confirmation.
- Draft writes: date and location fields.
- Accessibility: date inputs have labels; province/city selects retain focus order.

### 3. Guests and Budget

- Questions: expected guests; estimated budget.
- Required: either `expectedGuestCount` or `guestCountRange`.
- Optional: budget.
- Conditional: custom budget range when `budgetPreference === "custom"`.
- Validation: guest count whole number from 1 to 5000; budget minimum and maximum are integer PHP values; maximum cannot be below minimum.
- Back behavior: preserve numeric and range values.
- Skip behavior: budget can be `not-sure` or `prefer-not-to-say`.
- Dependencies: numeric guest count clears guest range and guest range clears numeric count.
- Draft writes: guest and budget fields.
- Accessibility: number inputs use `inputmode="numeric"` and clear field errors.

### 4. Venue Style

- Questions: atmosphere/style; indoor/outdoor setting; ranked top priorities.
- Required: `settingPreference`.
- Optional: `venueStyles`, `rankedPriorities`.
- Conditional: no style selections required when no preference is selected.
- Validation: no duplicate styles, no duplicate priorities, maximum three priorities.
- Back behavior: preserve priority order.
- Skip behavior: venue styles and priorities can be skipped.
- Dependencies: choosing "no preference" clears style selections after confirmation.
- Draft writes: style, setting, priority fields.
- Accessibility: ordered priority selects announce position.

### 5. Facilities and Requirements

- Questions: required amenities; additional requirements.
- Required: none.
- Optional: all fields.
- Conditional: choosing `none` is exclusive with other amenity selections.
- Validation: allowlisted amenity values, no duplicates, additional requirements maximum 500 characters.
- Back behavior: preserve selections.
- Skip behavior: step can be skipped.
- Dependencies: `none` clears other amenities after confirmation.
- Draft writes: amenities and additional text.
- Accessibility: checkbox group has descriptive legend.

### 6. Services Needed

- Questions: services still needed; custom service for `other`.
- Required: none.
- Optional: services.
- Conditional: `customService` required when `other` is selected.
- Validation: allowlisted service categories, no duplicates, custom service 2-80 characters.
- Back behavior: preserve selections.
- Skip behavior: step can be skipped.
- Dependencies: `already-have-all` is exclusive and sets `serviceSelectionMode` to `already-complete`.
- Draft writes: services, custom service, service mode.
- Accessibility: exclusive choice warning is announced before clearing other services.

### 7. Booking Preferences

- Questions: package preference; accredited supplier preference; payment preference; booking urgency; decision maker.
- Required: none.
- Optional: all fields.
- Conditional: payment preferences limited to current supported options.
- Validation: allowlisted values only.
- Back behavior: preserve all selections.
- Skip behavior: all questions can be skipped.
- Dependencies: no destructive dependencies.
- Draft writes: package, supplier, payment, urgency, decision-maker fields.
- Accessibility: compact choice groups with visible focus.

### 8. Event Plan Summary

- Questions: none; review and actions.
- Required: event type and date mode must be valid before summary.
- Optional: missing information section lists unanswered optional items.
- Conditional: save button requires auth or begins auth handoff.
- Validation: final draft schema before save or search handoff.
- Back behavior: edit buttons return to the relevant step and restore focus.
- Skip behavior: not applicable.
- Draft writes: `currentStep`, `completedSteps`, `updatedAt`.
- Accessibility: one `h1`, section headings, status messages for save and local draft.

## 5. Step-Navigation State Machine

Use internal wizard state, not route segments or query parameters. Full event-plan data must never appear in URL parameters.

- Initial step: `event-basics` for new drafts; restored drafts use saved `currentStep` when valid.
- Next transition: validate current step schema, update `completedSteps`, set next allowed step, save local draft.
- Previous transition: move to previous step without validation and preserve answers.
- Summary editing: set `currentStep` to the selected section and store `returnToSummary: true` in component state, not persisted draft.
- Conditional validation: validate only fields relevant to the selected mode.
- Completed-step tracking: store unique step IDs in order.
- Restored-step behavior: reject invalid step IDs and fall back to `event-basics`.
- Authentication-return behavior: after login, `/plan-event` loads the local draft, validates it, and presents save confirmation or autosaves when the draft contains a saved-plan marker.
- Start-over behavior: open confirmation dialog, clear local draft, reset to default draft, focus the first heading.

## 6. Validation Schemas

Create these schemas in `event-plan.schema.ts`:

- `eventPlanDraftSchema`: full client draft restore schema.
- `eventBasicsStepSchema`
- `dateLocationStepSchema`
- `guestsBudgetStepSchema`
- `venueStyleStepSchema`
- `requirementsStepSchema`
- `servicesStepSchema`
- `bookingPreferencesStepSchema`
- `eventPlanPersistenceSchema`
- `eventPlanSearchMappingSchema`

Validation rules:

- Custom event type: trimmed string, 2-80 characters, required only for `other`.
- Exact date: ISO date string, today or future in app timezone.
- Date range: both ISO date strings, start today or future, end on or after start.
- Preferred month/year: month 1-12, year current year through current year plus 5.
- Province/city: province must exist in `LUZON_PROVINCE_NAMES`; city must belong to selected province.
- Guest count: integer 1-5000.
- Budget range: integer PHP values, nonnegative, maximum greater than or equal to minimum.
- Ranked priorities: allowlisted values, no duplicates, maximum three.
- Amenities: allowlisted values, no duplicates, `none` exclusive.
- Services: allowlisted values, no duplicates, `already-have-all` exclusive.
- Additional requirements: trim, maximum 500 characters.
- Custom service: trim, 2-80 characters when `other` is selected.
- Payment preference: only `deposit-balance`, `full-payment`, or `no-preference` for Phase 1.
- Booking urgency: allowlisted values.

Validation timing:

- On field change: lightweight field feedback for visible fields.
- On step transition: current step schema.
- On local draft restore: full draft schema and schema version.
- Before server persistence: final persistence schema.

## 7. Reuse of Lookup Data

- Event types: fetch or map to existing `event_types`. UI labels may be friendly, but persisted IDs or canonical slugs must correspond to DB values.
- Supplier categories: use `supplier_categories` or existing supplier query fallback values for services needed.
- Amenities: reuse existing amenity names and search-supported amenity keys.
- Venue categories: reuse venue category names for venue style mapping where supported.
- Luzon locations: use `LUZON_LOCATIONS`, `getCitiesForProvince`, and `getMunicipalitiesForProvince`.

If a lookup request fails on `/plan-event`, the page should still render the deterministic wizard with safe built-in labels derived from the audited migration values. It must show a non-blocking warning that some lookup values may be unavailable and must still validate restored drafts against the local allowlist.

## 8. Anonymous Draft Persistence

Use key `venora:event-plan-draft:v1`.

Utility interfaces:

```ts
export function loadEventPlanDraft(): EventPlanDraftLoadResult;
export function saveEventPlanDraft(draft: EventPlanDraft): EventPlanDraftSaveResult;
export function clearEventPlanDraft(): void;
export function migrateEventPlanDraft(value: unknown): EventPlanDraft | null;
export function isEventPlanDraftExpired(draft: EventPlanDraft, now?: Date): boolean;
```

Rules:

- Storage schema version: `1`.
- Expiration: 30 days after `updatedAt`.
- Restoration: parse JSON, validate schema version, migrate compatible values, reject invalid or expired drafts.
- SSR safety: return an unavailable result when `window` is undefined.
- Hydration: load draft after mount and render a stable restore state before showing saved answers.
- Persistence: debounce local saves by 400 ms after draft changes.
- Start over: clear localStorage only after confirmation.
- Save status: show "Saved on this device", "Unable to save on this device", or "Restored from this device".
- Storage unavailable: keep in-memory state and warn that refresh may lose answers.
- Corrupt JSON: clear the corrupt value and show "We couldn't restore your previous planning session. You can start a new plan."

Never store auth tokens, passwords, payment data, provider secrets, or service-role data.

## 9. Database Schema

Recommended approach: one `event_plans` table with typed columns plus limited text arrays for flexible criteria. This keeps Phase 1 simple, secure, and queryable without overengineering child tables.

Proposed fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` | Stable plan ID. |
| `customer_id` | `uuid not null references public.profiles(id) on delete cascade` | Owner. |
| `title` | `text not null` | Generated default, customer editable later. |
| `status` | `text not null` | Check constraint for allowed statuses. |
| `event_type_id` | `uuid references public.event_types(id)` | Preferred when lookup ID is available. |
| `event_type` | `text` | Canonical fallback slug/name. |
| `custom_event_type` | `text` | Only for Other. |
| `date_preference_type` | `text not null` | Exact/range/month/flexible/not-sure. |
| `exact_date` | `date` | Exact date mode. |
| `preferred_date_start` | `date` | Range mode. |
| `preferred_date_end` | `date` | Range mode. |
| `preferred_month` | `integer` | 1-12. |
| `preferred_year` | `integer` | Four-digit year. |
| `preferred_province` | `text` | Searchable. |
| `preferred_city` | `text` | Searchable. |
| `nearby_locations_allowed` | `boolean not null default false` | Search expansion signal. |
| `expected_guest_count` | `integer` | Numeric count. |
| `guest_count_min` | `integer` | Derived from range. |
| `guest_count_max` | `integer` | Derived from range. |
| `budget_min` | `integer` | PHP whole pesos. |
| `budget_max` | `integer` | PHP whole pesos. |
| `currency` | `text not null default 'PHP'` | Check equals PHP for Phase 1. |
| `budget_preference` | `text` | Preserves not-sure/prefer-not-to-say/custom. |
| `setting_preference` | `text` | indoor/outdoor/both/no-preference. |
| `package_preference` | `text` | package preference. |
| `accredited_supplier_preference` | `text` | supplier openness. |
| `payment_preference` | `text` | supported payment preference. |
| `booking_urgency` | `text` | urgency. |
| `decision_maker_type` | `text` | decision maker. |
| `venue_styles` | `text[] not null default '{}'` | Flexible criteria. |
| `ranked_priorities` | `text[] not null default '{}'` | Ordered max three. |
| `required_amenities` | `text[] not null default '{}'` | Searchable subset. |
| `services_needed` | `text[] not null default '{}'` | Supplier criteria for later phase. |
| `additional_requirements` | `text` | Private note. |
| `completion_step` | `text not null` | Last completed step. |
| `created_at` | `timestamptz not null default now()` | Audit. |
| `updated_at` | `timestamptz not null default now()` | Trigger maintained. |
| `archived_at` | `timestamptz` | Set on archive. |

Indexes:

- `event_plans_customer_id_idx` on `customer_id`.
- `event_plans_customer_status_idx` on `(customer_id, status)`.
- `event_plans_event_type_idx` on `event_type`.
- `event_plans_exact_date_idx` on `exact_date`.
- `event_plans_location_idx` on `(preferred_province, preferred_city)`.
- `event_plans_guest_count_idx` on `expected_guest_count`.
- `event_plans_created_at_idx` on `created_at desc`.

Money is stored as integer PHP pesos. Dates are stored as Postgres `date`. Title generation happens in TypeScript before insert and can be recalculated when key fields change. Status transitions start as `draft`, become `completed` after summary save, and become `archived` only through archive action.

## 10. Migration Plan

Create the future migration with Supabase CLI:

`supabase migration new create_event_plans`

Conceptual migration contents:

- Create `public.event_plans`.
- Add primary key and foreign key to `public.profiles(id)`.
- Add check constraints for status, date preference, setting, payment, urgency, completion step, month range, guest ranges, and budget ranges.
- Add indexes listed in Section 9.
- Add updated-at trigger using the existing project trigger function when available; if no shared trigger exists, define a local `set_updated_at` function following existing migration conventions.
- Enable RLS.
- Revoke default table access from `PUBLIC`.
- Grant table access to `authenticated` only after RLS is enabled.
- Do not grant anonymous table access.
- Add customer-owned policies for select, insert, update, and delete/archive behavior.
- Add admin policy only if existing platform-administrator policies support the same pattern.
- Verify locally or in staging before production.

Rollback consideration: dropping the table is safe before production data exists. After production data exists, rollback should archive or migrate records instead of dropping customer plans.

## 11. RLS and Authorization

### Anonymous

- No direct `SELECT`.
- No direct `INSERT`.
- No direct `UPDATE`.
- No direct `DELETE`.

### Customer

- May insert only when `customer_id = auth.uid()`.
- May select only rows where `customer_id = auth.uid()`.
- May update only rows where `customer_id = auth.uid()`.
- Update policy must include `USING` and `WITH CHECK` so customers cannot reassign `customer_id`.
- May archive own plans through an update that sets `status = 'archived'` and `archived_at`.
- May not access another customer's plans.

### Venue Owner

- No access to private pre-booking plans.

### Supplier

- No access to private pre-booking plans.

### Coordinator

- No access to pre-booking plans by default.

### Admin

- Follow existing platform-administrator policy. Do not add broad client-side admin access unless the existing admin authorization model supports it.

Server actions must also verify the authenticated user ID and use repository methods scoped by `customerId`.

## 12. Server Action and Repository Design

Action interfaces:

```ts
export async function createEventPlanAction(input: CreateEventPlanInput): Promise<EventPlanActionResult>;
export async function updateEventPlanAction(input: UpdateEventPlanInput): Promise<EventPlanActionResult>;
export async function archiveEventPlanAction(input: ArchiveEventPlanInput): Promise<EventPlanActionResult>;
export async function getEventPlanAction(input: GetEventPlanInput): Promise<GetEventPlanResult>;
export async function listCustomerEventPlansAction(): Promise<ListEventPlansResult>;
export async function saveAnonymousDraftAfterAuthAction(input: SaveAnonymousDraftInput): Promise<EventPlanActionResult>;
```

Repository interfaces:

```ts
export type EventPlanRepository = {
  create(customerId: string, input: PersistedEventPlanInput): Promise<PersistedEventPlan>;
  findByIdForCustomer(customerId: string, planId: string): Promise<PersistedEventPlan | null>;
  listForCustomer(customerId: string): Promise<PersistedEventPlan[]>;
  updateForCustomer(customerId: string, planId: string, input: PersistedEventPlanUpdate): Promise<PersistedEventPlan>;
  archiveForCustomer(customerId: string, planId: string): Promise<PersistedEventPlan>;
};
```

Rules:

- Inputs are parsed by Zod before repository calls.
- Actions fetch the authenticated user from the server Supabase client.
- Missing user returns a typed unauthenticated result, not a raw Supabase error.
- Repository methods always accept `customerId`.
- Duplicate handoff saves are prevented by storing a local `pendingSaveFingerprint` and checking for a recent same-customer draft fingerprint before create.
- Failed saves return a typed result that leaves local draft intact.

## 13. Authentication Handoff

Flow:

1. Anonymous user completes questionnaire.
2. Draft is stored locally.
3. User selects "Save event plan".
4. Wizard sets local `pendingAuthSave = true`.
5. User is redirected to `/login?redirectTo=/plan-event`.
6. Login validates safe redirect with existing auth logic.
7. User returns to `/plan-event`.
8. Wizard restores and validates draft.
9. Wizard shows "Save this event plan to your account" or autosaves when `pendingAuthSave` is true.
10. Server creates one event-plan record.
11. Local draft is cleared only after successful persistence.
12. Saved confirmation is displayed.

No questionnaire data is placed in the URL. Duplicate saves are prevented by a draft fingerprint made from event type, date preference, location, guests, budget, and updated timestamp.

## 14. Authenticated Autosave

- Create the first authenticated record only when the customer explicitly saves or returns from an auth handoff with `pendingAuthSave`.
- Debounce updates by 800 ms after a saved plan ID exists.
- Save status states: `idle`, `saving`, `saved`, `unable-to-save`, `local-pending`.
- Use `updatedAt` from the last successful save to avoid overwriting newer server records.
- On network failure, keep local changes and show "Unable to save. Your answers remain on this device."
- Do not create one record per autosave. Updates require an existing saved plan ID.

## 15. Event Plan Summary

Summary sections:

### Event Overview

- Event type.
- Date preference.
- Location.
- Guest count.
- Budget.

### Venue Preferences

- Styles.
- Setting.
- Top priorities.
- Required amenities.
- Additional requirements.

### Services

- Services needed.
- Custom service.
- Package preference.
- Accredited supplier preference.

### Booking Preferences

- Payment preference.
- Booking urgency.
- Decision-maker type.

### Missing Information

Show compact notices for skipped budget, missing city, no required amenities, no services selected, and no booking urgency. These notices should not block saving.

### Actions

- Edit event basics.
- Edit date and location.
- Edit guests and budget.
- Edit venue style.
- Edit requirements.
- Edit services.
- Edit booking preferences.
- Save event plan.
- Find matching venues.
- Start over.

When returning from summary editing, focus the edited section button in the summary after the user continues.

## 16. Venue-Search Handoff

Create pure function:

```ts
export function mapEventPlanToVenueSearchParams(plan: EventPlanDraft): {
  params: URLSearchParams;
  appliedCriteria: string[];
  unsupportedCriteria: string[];
};
```

Mappings:

- `preferredProvince` -> `province`.
- `preferredCity` -> `city`.
- `eventType` -> `event` when mapped to existing event type.
- `expectedGuestCount` -> `capacity`.
- `budgetMin` -> `minBudget`.
- `budgetMax` -> `maxBudget`.
- `settingPreference` -> `indoorOutdoor` for `indoor`, `outdoor`, `both`.
- Supported `venueStyles` -> `venueTypes`.
- Supported `requiredAmenities` -> `amenities`.

Encoding:

- Single values use normal query string encoding.
- Arrays use comma-separated values to match existing `/venues` behavior.
- Values are allowlisted before encoding.

Unsupported criteria remain in the saved plan and are listed in `unsupportedCriteria`. The search page copy can say "Venues matching your event preferences." Phase 1 must not display numeric match percentages.

## 17. Landing-Page Integration

Modify `apps/web/app/(marketing)/page.tsx` in Task 18 only.

Add "Start planning your event" near the existing hero action area. Preserve "Browse venues". The planning CTA may be primary if the current page hierarchy supports it, but the venue browsing path must remain visible.

Supporting copy:

"Answer a few questions and build a personalized event plan before comparing venues and services."

On mobile, stack the two CTAs with equal width and no overlap.

## 18. UI Component Design

### EventPlanningWizard

- Props: lookup options, initial auth state, optional saved plan.
- State: draft, current step, restore status, save status, summary return target.
- Dependencies: draft utilities, step schemas, save actions, search mapper.
- Accessibility: focuses the step heading after step changes.
- Responsive behavior: desktop two-column layout with progress aside; mobile single column with step count.

### EventPlanningProgress

- Props: steps, current step, completed steps.
- State: none.
- Dependencies: constants.
- Accessibility: `aria-current="step"` and screen-reader progress text.
- Responsive behavior: compact horizontal labels on tablet, "Step N of 7" on mobile.

### Step Components

- Props: draft slice, submit callback, back callback, skip callback when supported.
- State: form-local React Hook Form state.
- Dependencies: Zod resolver and constants.
- Accessibility: fieldsets, legends, labels, field errors.
- Responsive behavior: controls wrap at tablet and stack on mobile.

### EventPlanSummary

- Props: draft, save status, edit callbacks, search callback.
- State: none except action loading states.
- Dependencies: title generator and search mapper.
- Accessibility: section headings and focus restoration after edit.

### EventPlanSaveStatus

- Props: status and message.
- State: none.
- Dependencies: none.
- Accessibility: `aria-live="polite"`.

### StartOverDialog

- Props: open, onCancel, onConfirm.
- State: none.
- Dependencies: existing dialog style.
- Accessibility: focus trap, Escape close, destructive confirmation label.

## 19. UX Requirements

The wizard should feel professional, calm, helpful, premium, human-designed, and easy for first-time event planners.

Avoid fake chatbot conversation, fake AI labels, excessive glassmorphism, giant hero panels inside the wizard, excessive pills, excessive animations, decorative floating shapes, long forms, long centered paragraphs, and huge empty spaces.

Desktop layout:

- Constrained customer page width.
- Left progress column around 240 px.
- Main question panel with readable text width.
- Context tip only when the reason for a question is not obvious.

Tablet layout:

- Progress becomes a compact top row.
- Question panel remains one column.
- Choice controls wrap cleanly.

Mobile layout:

- Compact header.
- "Step N of 7" progress.
- Natural scrolling.
- No fixed footer controls covering inputs.
- Continue and Back buttons stay reachable after content.

## 20. Accessibility Plan

- One `h1` per step.
- `fieldset` and `legend` for grouped choices.
- Keyboard operation for all controls.
- Focus moves to the new step heading after navigation.
- Progress changes announced with `aria-live`.
- Field-level error messages connected with `aria-describedby`.
- Error summary shown when multiple fields fail.
- Autosave status announced politely.
- Dialog focus returns to the Start over button after cancel.
- Touch targets at least 44 px.
- Selection state is communicated by text, border, and icon, not color alone.
- Reduced-motion preference disables nonessential transitions.
- Layout remains usable at 200 percent zoom.

## 21. Testing Plan

### Unit Tests

- Default draft contains schema version, first step, PHP currency, empty arrays, and null unanswered fields.
- Draft serialization writes only valid schema values.
- Draft restoration accepts valid current version.
- Corrupt draft rejection clears invalid JSON.
- Version mismatch rejects incompatible drafts.
- Draft expiration rejects drafts older than 30 days.
- Step validation rejects missing required event type.
- Date validation rejects past exact dates and reversed ranges.
- Guest validation rejects decimals, negatives, and zero.
- Budget validation rejects max below min.
- Priority validation rejects duplicates and more than three priorities.
- Exclusive service selection clears incompatible services.
- Title generation returns strings like `Wedding in Tagaytay` and `Birthday for 80 guests`.
- Search mapping only emits allowlisted `/venues` params.
- Safe return route remains `/plan-event`.

### Repository Tests

- Customer creates own plan.
- Customer reads own plan.
- Customer updates own plan.
- Customer archives own plan.
- Cross-customer access returns null or unauthorized typed result.
- Invalid payload is rejected before Supabase write.
- Duplicate handoff save returns existing recent plan instead of creating another.

### RLS Tests

- Customer can access own rows.
- Unrelated customer cannot access rows.
- Anonymous role cannot access rows.
- Venue owner cannot access rows.
- Supplier cannot access rows.
- Coordinator cannot access rows.
- Administrator follows existing platform policy.

### Browser Tests

- Anonymous complete journey.
- Back navigation preserves answers.
- Draft restoration after refresh.
- Authentication handoff saves draft.
- Authenticated autosave updates one record.
- Summary editing returns to edited section.
- Search handoff applies supported filters.
- Start over cancel and confirm behavior.
- Validation errors block progression with understandable copy.
- Mobile layout at 390 px and 360 px has no horizontal overflow.
- Cross-account direct plan access is denied.

## 22. Implementation Tasks

### Task 1: Domain Types and Constants

**Objective:** Add event-planning type and constant foundation.

**Exact files:**

- Create `apps/web/src/features/event-planning/domain/event-plan.types.ts`.
- Create `apps/web/src/features/event-planning/domain/event-plan.constants.ts`.
- Test `apps/web/src/features/event-planning/domain/event-plan.constants.test.ts`.

**Interfaces consumed:** none.

**Interfaces produced:** `EventPlanDraft`, union types from Section 3, `EVENT_PLANNING_STEPS`, `EVENT_PLAN_DRAFT_VERSION`, `EVENT_PLAN_DRAFT_STORAGE_KEY`, option arrays.

**Failing tests to write first:** constants test asserting the first step is `event-basics`, summary is last, draft key is `venora:event-plan-draft:v1`, and payment options contain only supported values.

**Expected failure:** imports fail because files do not exist.

**Minimal implementation:** create the type and constant files exactly matching Section 3.

**Validation command:** `pnpm --filter @venora/web test -- src/features/event-planning/domain/event-plan.constants.test.ts`.

**Expected passing result:** one constants test file passes.

**Commit boundary:** `feat(event-planning): add domain model constants`.

**Completion criteria:** exported types and constants compile and tests pass.

### Task 2: Validation Schemas

**Objective:** Add Zod schemas for all steps and final persistence input.

**Exact files:**

- Create `apps/web/src/features/event-planning/schemas/event-plan.schema.ts`.
- Test `apps/web/src/features/event-planning/schemas/event-plan.schema.test.ts`.

**Interfaces consumed:** types and constants from Task 1, `LUZON_PROVINCE_NAMES`, `getCitiesForProvince`.

**Interfaces produced:** schemas listed in Section 6 and `parseEventPlanDraft`.

**Failing tests to write first:** tests for custom event type, date range, province/city relationship, guest count, budget range, priority duplicates, and exclusive services.

**Expected failure:** schema exports are missing.

**Minimal implementation:** write schema refinements for each behavior named in the tests.

**Validation command:** `pnpm --filter @venora/web test -- src/features/event-planning/schemas/event-plan.schema.test.ts`.

**Expected passing result:** schema tests pass.

**Commit boundary:** `feat(event-planning): add planning validation schemas`.

**Completion criteria:** all step schemas parse valid data and reject invalid data with stable messages.

### Task 3: Draft Persistence

**Objective:** Add SSR-safe versioned localStorage persistence.

**Exact files:**

- Create `apps/web/src/features/event-planning/utils/event-plan-draft.ts`.
- Test `apps/web/src/features/event-planning/utils/event-plan-draft.test.ts`.

**Interfaces consumed:** `EventPlanDraft`, draft schema.

**Interfaces produced:** draft utility functions from Section 8.

**Failing tests to write first:** valid save/load, corrupt JSON rejection, expired draft rejection, SSR unavailable result, and clear draft.

**Expected failure:** draft utility exports are missing.

**Minimal implementation:** implement utilities with injected storage for tests and `window.localStorage` for browser use.

**Validation command:** `pnpm --filter @venora/web test -- src/features/event-planning/utils/event-plan-draft.test.ts`.

**Expected passing result:** draft utility tests pass.

**Commit boundary:** `feat(event-planning): persist anonymous planning drafts`.

**Completion criteria:** invalid drafts never hydrate into wizard state.

### Task 4: Database Migration and RLS

**Objective:** Add private `event_plans` storage.

**Exact files:**

- Create migration through `supabase migration new create_event_plans`.
- Modify generated `supabase/migrations/<timestamp>_create_event_plans.sql`.
- Test with repository/RLS test files selected by existing test setup.

**Interfaces consumed:** schema design from Section 9.

**Interfaces produced:** `public.event_plans` table and RLS policies.

**Failing tests to write first:** RLS tests proving anonymous, unrelated customer, venue owner, supplier, and coordinator cannot access another customer's event plans.

**Expected failure:** table does not exist.

**Minimal implementation:** create table, constraints, indexes, grants, RLS, and ownership policies.

**Validation command:** approved local Supabase RLS test command documented by the implementation session.

**Expected passing result:** role-based access matrix passes locally.

**Commit boundary:** `feat(event-planning): add event plan storage and RLS`.

**Completion criteria:** local/staging migration applies and RLS blocks cross-account access.

### Task 5: Repository and Server Actions

**Objective:** Add authenticated CRUD actions for event plans.

**Exact files:**

- Create `apps/web/src/features/event-planning/infrastructure/event-plan.repository.ts`.
- Create `apps/web/src/features/event-planning/application/event-plan.actions.ts`.
- Test repository/action files.

**Interfaces consumed:** database table from Task 4, persistence schema from Task 2.

**Interfaces produced:** action and repository functions from Section 12.

**Failing tests to write first:** create own plan, read own plan, update own plan, archive own plan, reject invalid payload, reject unauthenticated save.

**Expected failure:** action and repository exports are missing.

**Minimal implementation:** server actions validate input, fetch auth user, call owner-scoped repository methods, return typed results.

**Validation command:** `pnpm --filter @venora/web test -- src/features/event-planning`.

**Expected passing result:** repository/action tests pass.

**Commit boundary:** `feat(event-planning): add plan repository actions`.

**Completion criteria:** no client component imports service-role helpers.

### Task 6: Wizard Shell and Navigation

**Objective:** Add `/plan-event` route and wizard state machine.

**Exact files:**

- Create route files under `apps/web/app/(customer)/plan-event/`.
- Create `EventPlanningWizard.tsx`.
- Create `EventPlanningProgress.tsx`.

**Interfaces consumed:** constants, schemas, draft utilities.

**Interfaces produced:** working wizard shell with next, previous, restore, and start-over state hooks.

**Failing tests to write first:** browser/component test that starts at Step 1, blocks invalid next, moves to Step 2 after valid answer, then moves back preserving answer.

**Expected failure:** route/component missing.

**Minimal implementation:** render shell with placeholder step bodies wired to real state.

**Validation command:** focused browser/component test command chosen by existing infrastructure.

**Expected passing result:** navigation test passes.

**Commit boundary:** `feat(event-planning): add planning wizard shell`.

**Completion criteria:** wizard has stable desktop/mobile layout and no one-page long form.

### Task 7: Event Basics Step

**Objective:** Implement event type selection.

**Exact files:** `EventBasicsStep.tsx`, schema tests, wizard integration test.

**Interfaces consumed:** `eventBasicsStepSchema`, event type constants.

**Interfaces produced:** `EventBasicsStep`.

**Failing tests to write first:** selecting `other` without custom text blocks continue; valid custom text allows continue.

**Expected failure:** step component missing behavior.

**Minimal implementation:** React Hook Form radio group and conditional custom input.

**Validation command:** focused event basics test.

**Expected passing result:** event basics tests pass.

**Commit boundary:** `feat(event-planning): add event basics step`.

**Completion criteria:** no generic free text replaces established categories.

### Task 8: Date and Location Step

**Objective:** Implement date preference and location selection.

**Exact files:** `DateLocationStep.tsx`, date/location tests.

**Interfaces consumed:** date schema, location helpers.

**Interfaces produced:** `DateLocationStep`.

**Failing tests to write first:** reversed date range blocks continue; city from another province is rejected.

**Expected failure:** validation or UI missing.

**Minimal implementation:** date mode choice, conditional inputs, province/city selects.

**Validation command:** focused date/location tests.

**Expected passing result:** date and location tests pass.

**Commit boundary:** `feat(event-planning): add date location step`.

**Completion criteria:** users are not asked for exact street addresses.

### Task 9: Guests and Budget Step

**Objective:** Implement guest and budget capture.

**Exact files:** `GuestsBudgetStep.tsx`, guests/budget tests.

**Interfaces consumed:** guests/budget schema and currency formatting.

**Interfaces produced:** `GuestsBudgetStep`.

**Failing tests to write first:** decimal guest count rejected; budget maximum below minimum rejected.

**Expected failure:** component or schema missing.

**Minimal implementation:** numeric guest input or ranges, budget ranges, custom min/max.

**Validation command:** focused guests/budget tests.

**Expected passing result:** guests and budget tests pass.

**Commit boundary:** `feat(event-planning): add guests budget step`.

**Completion criteria:** budget remains optional and displayed in PHP.

### Task 10: Venue Style Step

**Objective:** Implement style, setting, and priorities.

**Exact files:** `VenueStyleStep.tsx`, venue-style tests.

**Interfaces consumed:** venue style constants and schema.

**Interfaces produced:** `VenueStyleStep`.

**Failing tests to write first:** more than three priorities rejected; duplicate priorities rejected.

**Expected failure:** step missing.

**Minimal implementation:** checkbox style selection, setting radio group, three ordered priority selects.

**Validation command:** focused venue-style tests.

**Expected passing result:** venue-style tests pass.

**Commit boundary:** `feat(event-planning): add venue style step`.

**Completion criteria:** no drag-and-drop dependency is introduced.

### Task 11: Facilities and Requirements Step

**Objective:** Implement amenity and requirement capture.

**Exact files:** `RequirementsStep.tsx`, requirements tests.

**Interfaces consumed:** amenity constants and schema.

**Interfaces produced:** `RequirementsStep`.

**Failing tests to write first:** `none` is exclusive; additional requirements over 500 characters rejected.

**Expected failure:** step missing.

**Minimal implementation:** checkbox group and optional textarea.

**Validation command:** focused requirements tests.

**Expected passing result:** requirements tests pass.

**Commit boundary:** `feat(event-planning): add requirements step`.

**Completion criteria:** accessibility questions remain practical facility requirements.

### Task 12: Services Needed Step

**Objective:** Implement services needed.

**Exact files:** `ServicesStep.tsx`, services tests.

**Interfaces consumed:** supplier category constants and services schema.

**Interfaces produced:** `ServicesStep`.

**Failing tests to write first:** `already-have-all` clears incompatible services; `other` requires custom service.

**Expected failure:** step missing.

**Minimal implementation:** service checkbox group with exclusive all-set option and custom text input.

**Validation command:** focused services tests.

**Expected passing result:** services tests pass.

**Commit boundary:** `feat(event-planning): add services step`.

**Completion criteria:** no supplier records are created from answers.

### Task 13: Booking Preferences Step

**Objective:** Implement package, supplier, payment, urgency, and decision preferences.

**Exact files:** `BookingPreferencesStep.tsx`, booking-preferences tests.

**Interfaces consumed:** booking preference constants and schema.

**Interfaces produced:** `BookingPreferencesStep`.

**Failing tests to write first:** unsupported payment value is rejected; skipping all questions still allows summary.

**Expected failure:** step missing.

**Minimal implementation:** compact radio groups for each optional preference.

**Validation command:** focused booking preference tests.

**Expected passing result:** booking preference tests pass.

**Commit boundary:** `feat(event-planning): add booking preferences step`.

**Completion criteria:** payment options match supported Venora behavior only.

### Task 14: Event Plan Summary

**Objective:** Generate summary and edit actions.

**Exact files:** `EventPlanSummary.tsx`, `event-plan-title.ts`, summary/title tests.

**Interfaces consumed:** full draft, title generator.

**Interfaces produced:** `EventPlanSummary`, `generateEventPlanTitle`.

**Failing tests to write first:** title for wedding in city; missing budget shown as a non-blocking notice; edit action returns to expected step.

**Expected failure:** summary/title exports missing.

**Minimal implementation:** render sections and action buttons from draft state.

**Validation command:** focused summary tests.

**Expected passing result:** summary tests pass.

**Commit boundary:** `feat(event-planning): add event plan summary`.

**Completion criteria:** summary displays no fake venue or supplier results.

### Task 15: Authentication Handoff

**Objective:** Preserve anonymous draft through login.

**Exact files:** wizard component, save status component, server action tests.

**Interfaces consumed:** auth redirect behavior, draft utilities, create action.

**Interfaces produced:** save handoff behavior.

**Failing tests to write first:** clicking save while anonymous sets pending auth save and redirects to `/login?redirectTo=/plan-event`.

**Expected failure:** save handoff missing.

**Minimal implementation:** wire save button to local pending flag and safe redirect.

**Validation command:** browser auth handoff test.

**Expected passing result:** draft restores after login return.

**Commit boundary:** `feat(event-planning): preserve plans through auth`.

**Completion criteria:** local draft clears only after server save succeeds.

### Task 16: Authenticated Autosave

**Objective:** Update one saved plan record after customer save.

**Exact files:** wizard, save status component, action tests.

**Interfaces consumed:** update action and saved plan ID.

**Interfaces produced:** debounced autosave state.

**Failing tests to write first:** editing saved draft calls update, not create, and leaves local draft when update fails.

**Expected failure:** autosave missing.

**Minimal implementation:** debounce updates and show status.

**Validation command:** focused autosave tests.

**Expected passing result:** autosave tests pass.

**Commit boundary:** `feat(event-planning): add authenticated autosave`.

**Completion criteria:** rapid edits do not create duplicate plans.

### Task 17: Venue-Search Handoff

**Objective:** Map supported criteria to `/venues`.

**Exact files:** `event-plan-search-mapper.ts`, mapper tests, summary integration.

**Interfaces consumed:** draft and allowlists.

**Interfaces produced:** `mapEventPlanToVenueSearchParams`.

**Failing tests to write first:** province, city, event, capacity, budget, setting, venue types, and amenities map; unsupported values are preserved.

**Expected failure:** mapper missing.

**Minimal implementation:** pure mapper returning params, applied criteria, unsupported criteria.

**Validation command:** mapper tests.

**Expected passing result:** mapper tests pass.

**Commit boundary:** `feat(event-planning): map plans to venue search`.

**Completion criteria:** no supplier search claims are made.

### Task 18: Landing-Page Integration

**Objective:** Add planning entry point.

**Exact files:** `apps/web/app/(marketing)/page.tsx`, browser test.

**Interfaces consumed:** `/plan-event` route.

**Interfaces produced:** landing CTA.

**Failing tests to write first:** landing page contains "Start planning your event" link to `/plan-event` and still contains browse venues link.

**Expected failure:** CTA missing.

**Minimal implementation:** add CTA in existing hero/action area.

**Validation command:** landing browser/component test.

**Expected passing result:** CTA test passes.

**Commit boundary:** `feat(event-planning): add landing entry point`.

**Completion criteria:** landing page is not redesigned.

### Task 19: Accessibility Verification

**Objective:** Verify keyboard, focus, labels, announcements, and zoom behavior.

**Exact files:** test files and source fixes discovered by accessibility tests.

**Interfaces consumed:** completed wizard UI.

**Interfaces produced:** accessibility fixes.

**Failing tests to write first:** focus moves to next heading, grouped controls have legends, error messages connect to fields.

**Expected failure:** any missing accessibility behavior is exposed.

**Minimal implementation:** add missing labels, focus management, and ARIA attributes.

**Validation command:** focused accessibility/browser tests.

**Expected passing result:** accessibility tests pass.

**Commit boundary:** `test(event-planning): verify planning accessibility`.

**Completion criteria:** desktop, tablet, mobile, keyboard, and 200 percent zoom checks pass.

### Task 20: Browser and RLS Testing

**Objective:** Run end-to-end flow and role access matrix.

**Exact files:** browser test files and RLS test files.

**Interfaces consumed:** complete feature and local/staging Supabase.

**Interfaces produced:** regression coverage.

**Failing tests to write first:** anonymous complete journey, draft restoration, auth handoff, search handoff, and cross-account denial.

**Expected failure:** uncovered flow or missing test support fails first.

**Minimal implementation:** add tests and fix only event-planning bugs surfaced by them.

**Validation command:** relevant browser and RLS test commands.

**Expected passing result:** all event-planning browser and RLS tests pass.

**Commit boundary:** `test(event-planning): add authorization browser coverage`.

**Completion criteria:** all acceptance-critical flows are verified.

### Task 21: Documentation and Final Validation

**Objective:** Document feature behavior and run final validation.

**Exact files:**

- Create `docs/features/customer-event-planning-journey.md`.
- Create `docs/qa/customer-event-planning-test-report.md`.
- Create `docs/security/event-plan-access-control.md`.

**Interfaces consumed:** implemented feature, migration, tests.

**Interfaces produced:** feature, QA, and security documentation.

**Failing tests to write first:** no production test required; docs must reference completed verification output.

**Expected failure:** documentation absent.

**Minimal implementation:** write docs covering purpose, steps, draft behavior, auth handoff, RLS, search mapping, supported/unsupported criteria, accessibility, local development, staging verification, limitations, and Phase 2 points.

**Validation command:** `pnpm --filter @venora/web type-check`, `pnpm --filter @venora/web build`, `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`, `git diff --check`, and `git status`.

**Expected passing result:** commands pass with no conflict markers and clean diff check.

**Commit boundary:** `docs(event-planning): document customer planning journey`.

**Completion criteria:** final report can classify implementation accurately.

## 23. Commit Plan

- `feat(event-planning): add domain model and validation`
- `feat(event-planning): persist anonymous planning drafts`
- `feat(event-planning): add event plan storage and RLS`
- `feat(event-planning): add customer event planning wizard`
- `feat(event-planning): add event plan summary`
- `feat(event-planning): preserve plans through authentication`
- `feat(event-planning): map plans to venue search`
- `test(event-planning): add authorization and browser coverage`
- `docs(event-planning): document customer planning journey`

Do not commit during the documentation-only planning task unless explicitly authorized.

## 24. Final Acceptance Criteria

Phase 1 is complete only when:

- `/plan-event` works.
- Existing AI planner remains unchanged.
- Anonymous users can complete the wizard.
- Draft survives refresh.
- Back navigation preserves data.
- Optional questions can be skipped.
- Validation works.
- Summary accurately reflects answers.
- Summary sections can be edited.
- Authentication handoff preserves the plan.
- Authenticated customer can save.
- Duplicate plans are not created.
- Customer-only RLS works.
- Cross-account access fails.
- Venue owners cannot access private plans.
- Suppliers cannot access private plans.
- Unassigned coordinators cannot access private plans.
- Search handoff applies supported filters.
- Unsupported criteria remain stored.
- No fake AI claims appear.
- No fake availability appears.
- Desktop works.
- Tablet works.
- Mobile works.
- Accessibility passes.
- Automated tests pass.
- Browser tests pass.
- Type-check passes.
- Build passes.
- `package.json` is unchanged.
- `pnpm-lock.yaml` is unchanged.

## Document Self-Review

- Missing requirements: all requested Phase 1 planning, persistence, RLS, handoff, accessibility, testing, and acceptance areas are mapped to tasks.
- Contradictory architecture: none found. `/plan-event` remains deterministic and separate from `/account/event-planner`.
- Duplicate tables or components: plan creates one `event_plans` table only after implementation approval; existing AI planner remains untouched.
- Undefined interfaces: action, repository, draft utility, title, and mapper interfaces are defined with names and signatures.
- Inconsistent field names: draft fields and database fields are intentionally mapped with camelCase client names and snake_case database names.
- Placeholder text: no task relies on undefined placeholders.
- Unsupported assumptions: supplier URL handoff is deferred because current supplier search is client-side.
- RLS rules: anonymous, customer, owner, supplier, coordinator, and admin behavior is specified.
- Tests: unit, repository, RLS, browser, accessibility, and final validation are specified.
- Responsive behavior: desktop, tablet, and mobile behavior is specified.
- Accessibility behavior: heading, focus, fieldset, error, autosave, dialog, touch, reduced-motion, and zoom behavior is specified.
