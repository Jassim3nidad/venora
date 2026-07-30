# Customer Event Planning Phase 1 Audit

## 1. Executive Summary

Venora needs a guided customer journey because event customers are not only booking a room. They are making early planning decisions about location, date flexibility, guest count, venue style, facilities, suppliers, packages, and payment preferences. A structured questionnaire gives Venora clean criteria that can later power search, recommendations, inquiries, proposals, and booking preparation.

The existing AI event planner at `apps/web/app/(customer)/account/event-planner/page.tsx` is not suitable for Phase 1. It is authenticated, AI-assisted, and produces a generated planning response from a single form. Phase 1 needs an anonymous deterministic questionnaire that creates structured answers before any AI layer is introduced.

`/plan-event` should remain separate from `/account/event-planner`. The new route should collect reliable planning data, preserve anonymous drafts locally, and save private event plans only after customer authentication. The AI planner can later consume saved plans, but it should not become the source of truth for Phase 1.

Deterministic structured answers must come before AI recommendations so the product does not display fake match scores, fake availability, or unverified recommendations. The first reliable milestone is a customer-owned Event Plan Summary and a safe handoff into existing venue search filters.

## 2. Existing Routes

| Area | Route | Repository path | Current behavior |
| --- | --- | --- | --- |
| AI event planner | `/account/event-planner` | `apps/web/app/(customer)/account/event-planner/page.tsx` | Signed-in AI-assisted planner using `EventPlanner`. |
| Venue search | `/venues` | `apps/web/app/(customer)/venues/page.tsx` | Public marketplace with URL-backed filters and client-side sorting. |
| Venue details | `/venues/[slug]` | `apps/web/app/(customer)/venues/[slug]/page.tsx` | Public detail page with booking CTA, owner trust access, reviews, and recommendations. |
| Supplier marketplace | `/suppliers` | `apps/web/app/(customer)/suppliers/page.tsx` | Public supplier listing with client-side filters. |
| Login | `/login` | `apps/web/app/(auth)/login/page.tsx` | Uses safe `redirectTo` behavior through auth actions. |
| Auth callback | `/auth/callback` | `apps/web/app/auth/callback/route.ts` | Exchanges code and resolves a safe internal `next` route. |
| Customer bookings | `/bookings` and `/bookings/[id]` | `apps/web/app/(customer)/bookings` | Authenticated customer booking list and detail flow. |
| Customer account | `/account` | `apps/web/app/(customer)/account` | Authenticated account area. |
| Profile setup | `/profile/setup` | `apps/web/app/profile/setup/page.tsx` | Multi-step profile setup wizard. |

## 3. Existing Reusable Architecture

| Reusable area | Existing files or patterns | Reuse direction |
| --- | --- | --- |
| Wizard components | `apps/web/src/features/auth/ui/ProfileSetupWizard.tsx`, `apps/web/src/features/partner-applications/ui/PartnerWizard.tsx`, package builder steps | Reuse the step/progress style and state separation, not the domain logic. |
| Form patterns | React Hook Form and Zod in booking, venues, calendar, supplier, business-profile, and admin forms | Use React Hook Form for step forms and Zod for step and persistence schemas. |
| Validation patterns | `apps/web/src/features/*/schemas/*.schema.ts` | Add event-planning schemas under a focused feature module. |
| Server actions | `apps/web/src/features/*/application/actions.ts` and `actions/*.ts` | Keep persistence server-side and validate inputs before Supabase writes. |
| Repository patterns | Feature-level `application/queries.ts` and Supabase repository modules | Add event-plan repository methods under `src/features/event-planning/infrastructure`. |
| Supabase clients | `apps/web/src/lib/supabase/server.ts`, `client.ts`, `admin.ts`, `service.ts` | Use server client for authenticated actions. Do not use service-role in client components. |
| Auth redirects | `loginAction`, `resolvePostAuthRedirect`, `/auth/callback` safe redirect handling | Use existing `redirectTo` and internal route safety for anonymous draft save handoff. |
| Design-system style | Existing Tailwind utility patterns, Lucide icons, cards, forms, buttons | Keep UI restrained, customer-facing, and consistent with `/venues`. |
| Location selectors | `apps/web/src/data/luzon-locations.ts`, venue/supplier location pickers | Reuse Luzon location data and province/city relationship validation. |
| Currency formatting | Existing peso formatting utilities and display conventions in venues/bookings | Store money as integer peso values and format with existing PHP display conventions. |
| Search utilities | `VenueSearchParams`, marketplace query parsing, client filters | Map supported event-plan criteria into existing `/venues` search parameters. |
| Testing infrastructure | Existing Vitest-style feature tests and route tests | Add focused unit tests for draft, validation, title generation, and search mapping. |

## 4. Existing Lookup Data

The implementation should reuse existing lookup values instead of creating parallel lists.

### Event Types

Source: `supabase/migrations/0040_venues.sql`

- Wedding
- Birthday
- Corporate
- Debut
- Graduation
- Reunion
- Conference
- Seminar
- Product Launch
- Other

The questionnaire can label "Corporate event" in UI, but persisted values should map to existing event type data.

### Venue Categories

Source: `supabase/migrations/0040_venues.sql`

- Garden
- Beach
- Resort
- Hotel Ballroom
- Restaurant
- Function Hall
- Church
- Events Space
- Rooftop
- Farm

Venue-style answers should map only when the existing venue search supports the equivalent category.

### Amenities

Source: `supabase/migrations/0040_venues.sql`

- Air Conditioning
- Parking
- Backup Generator
- Bridal Suite
- Groom Suite
- Swimming Pool
- Kids Area
- Sound System
- LED Wall
- Projector
- Catering Kitchen
- Bar Area
- Garden Area
- Stage
- Dance Floor
- Overnight Accommodation
- Wheelchair Ramp
- Pet Friendly Area
- Wi-Fi
- CCTV

Required-facility answers should map to these amenities or existing venue boolean flags where supported.

### Supplier Categories

Source: `supabase/migrations/006_suppliers.sql`

- Catering
- Photography
- Videography
- Floral & Styling
- Lights & Sounds
- Event Coordination
- Cake & Desserts
- Hair & Makeup
- Transportation
- Entertainment
- Photo Booth
- Other

Services-needed answers should store requirements only. They must not create supplier records or claim supplier recommendations.

### Luzon Location Data

Source: `apps/web/src/data/luzon-locations.ts`

The file exports `LUZON_LOCATIONS`, `LUZON_PROVINCE_NAMES`, `getCitiesForProvince`, and `getMunicipalitiesForProvince`. The event-planning flow should reuse those helpers for location selection and province/city validation.

## 5. Existing Search Capabilities

The current venue search accepts these parameters:

| Search parameter | Existing support | Event-plan mapping |
| --- | --- | --- |
| `q` | Text search across venue name and location fields | Do not map broad planning notes into `q`. |
| `province` | Exact province filter | Map preferred province. |
| `city` | Exact city filter | Map preferred city. |
| `municipality` | Exact municipality filter | Map municipality if added to the plan in a later iteration. |
| `location` | Broad location text | Use only when province/city cannot represent the user answer. |
| `event` | Event type lookup filter | Map supported event type. |
| `budget` | Preset price bands | Prefer `minBudget` and `maxBudget` for plan ranges. |
| `minBudget` | Minimum base price | Map budget minimum when supplied. |
| `maxBudget` | Maximum base price | Map budget maximum when supplied. |
| `capacity` | `capacity_max >= capacity` | Map numeric guest count. |
| `venueTypes` | Venue category names | Map supported venue style/category selections. |
| `indoorOutdoor` | `indoor`, `outdoor`, or `both` | Map setting preference. |
| `amenities` | Amenity/boolean filters | Map required amenities that exist in venue filters. |
| Sort | Client-side sort | Keep default sort unless the user selected a priority that has supported sort behavior. |

Supplier search is more limited for Phase 1. `/suppliers` supports local filtering by search text, category, location, price, rating, and sort, but it does not currently expose a URL-based event-plan handoff. Supplier criteria should remain in the saved event plan until a later supplier recommendation or search-handoff phase.

## 6. Existing Authentication Behavior

Login supports an optional `redirectTo` value through the auth schema and login action. The auth callback route supports a safe internal `next` path and resolves the final post-auth destination through existing redirect helpers.

The event-planning handoff should use this behavior without putting questionnaire answers in the URL:

1. Anonymous customer completes `/plan-event`.
2. Draft remains in versioned localStorage.
3. Customer selects "Save event plan".
4. App redirects to login or registration with a safe internal return path to `/plan-event`.
5. After authentication, `/plan-event` restores and validates the local draft.
6. The authenticated customer saves the plan through a server action.
7. The local draft is cleared only after persistence succeeds.

## 7. Existing Persistence Patterns

Existing localStorage usage appears in venue comparison and AI assistant conversation state. No existing event-plan draft persistence exists.

Authenticated ownership patterns exist across bookings, favorites, reviews, supplier inquiries, and business profiles. New event plans should follow the same model: server-side user lookup, validated input, owner-scoped queries, and RLS as the database security boundary.

Database tables commonly use UUID primary keys, `created_at`, `updated_at`, ownership foreign keys, indexes for owner/status fields, and RLS policies on public-schema tables. A new event-plan migration should follow those conventions when implementation begins.

## 8. Missing Functionality

- Public `/plan-event` route.
- Anonymous multi-step questionnaire.
- Event-plan domain types and constants.
- Per-step validation schemas.
- Versioned localStorage draft persistence.
- Draft restoration after refresh.
- Corrupt/expired draft rejection.
- Start-over confirmation.
- Event Plan Summary.
- Summary edit actions.
- Save-to-account flow.
- Authentication handoff from anonymous draft.
- Private `event_plans` persistence.
- Customer-only RLS policies.
- Repository and server actions.
- Authenticated autosave.
- Venue-search handoff mapper.
- Landing-page "Start planning your event" entry point.
- Unit, repository, RLS, and browser tests.

## 9. Architectural Conflict

The existing `/account/event-planner` route is AI-based and requires authentication. It should not be replaced because it already serves a different product function. It should not be reused as the Phase 1 wizard because it does not support anonymous completion, deterministic step validation, local draft restoration, or private structured event-plan storage.

Phase 1 should produce structured data that may later feed the AI planner. The safest architecture is two separate experiences:

- `/plan-event`: deterministic public questionnaire and Event Plan Summary.
- `/account/event-planner`: existing authenticated AI-assisted planner.

## 10. Recommended Direction

- Create public deterministic route `/plan-event`.
- Keep anonymous progress in `venora:event-plan-draft:v1`.
- Add authenticated private `event_plans` records in a later implementation task.
- Protect persisted plans with customer-only RLS.
- Generate an Event Plan Summary from validated draft state.
- Map supported answers into `/venues` filters.
- Preserve unsupported criteria in the draft and saved plan.
- Keep supplier search integration out of Phase 1 unless the supplier marketplace gains URL-backed filters.
- Avoid AI labels, numeric match percentages, fake availability, and fake recommendations.

## 11. Risk Assessment

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Duplicate planning systems | Confuses users and developers | Keep `/plan-event` and `/account/event-planner` separate with clear naming. |
| Draft loss during authentication | Customer loses work | Keep answers in localStorage until server save succeeds. |
| Invalid restored localStorage data | Broken UI or unsafe payloads | Validate restored drafts with a versioned Zod schema. |
| Search does not support every answer | User expects hidden criteria to apply | Show only supported applied filters and preserve unsupported criteria in the plan. |
| Cross-account event-plan access | Private customer data leak | Use customer-only RLS plus server-side ownership checks. |
| Oversized page component | Hard to test and maintain | Split into domain, schemas, draft utilities, mapper, actions, repository, and step components. |
| Fake recommendation claims | Damages trust | Use deterministic criteria copy only; no AI or match-score language. |
| Unsupported payment preferences | Misleads customers | Offer only payment preferences supported by current booking/payment flow. |
| Hydration problems from localStorage | First render mismatch | Load drafts client-side after mount and show a stable loading/restore state. |
| Stale draft schema versions | Old drafts corrupt new flows | Store `schemaVersion`, migrate compatible drafts, reject incompatible drafts calmly. |
| Lookup data duplication | Divergent event/category values | Reuse existing DB lookups and shared constants. |

## 12. Final Audit Classification

| Area | Classification | Notes |
| --- | --- | --- |
| Existing AI planner | Implemented but unverified | Existing authenticated AI planner exists and should remain separate. |
| Guided questionnaire | Missing | No anonymous multi-step deterministic planner found. |
| Anonymous draft | Missing | localStorage patterns exist, but not for event plans. |
| Event-plan persistence | Missing | No private pre-booking `event_plans` model found. |
| RLS | Missing | No event-plan table or policies exist yet. |
| Event-plan summary | Missing | Existing AI output is not a structured summary from wizard answers. |
| Venue-search handoff | Missing | Search filters exist, but no event-plan mapper exists. |
| Supplier-search handoff | Partial | Supplier filters exist client-side, but no URL-backed handoff was found. |
| Automated tests | Missing | No event-planning tests exist. |
| Browser tests | Missing | No event-planning browser scenarios exist. |
