# Customer Event Planning Journey

Date: July 31, 2026

## Scope

Customer Event Planning Phase 1 adds a deterministic public planning journey at `/plan-event`. It helps customers structure an event plan before browsing Venora venues. It does not replace `/account/event-planner`, does not make AI recommendations, and does not claim venue or supplier availability.

## Entry Points

- Landing page primary CTA: `Start planning your event` links to `/plan-event`.
- Landing page venue browsing CTA remains available.
- `/plan-event` is public and can be used anonymously.

## Anonymous Questionnaire Journey

Anonymous customers can complete the full questionnaire without signing in. The wizard stores answers locally on the device, validates required fields step by step, and ends on the Event Plan Summary.

The seven questionnaire sections are:

1. Event Basics
2. Date and Location
3. Guests and Budget
4. Venue Style
5. Facilities and Requirements
6. Services Needed
7. Booking Preferences

After those sections, the wizard shows Event Plan Summary. The summary reflects the captured answers and lets the customer edit each section before continuing.

## Draft Persistence

Anonymous drafts are stored in `localStorage` under the versioned key `venora:event-plan-draft:v1`.

Behavior:

- Drafts save locally after wizard changes.
- Drafts restore after refresh.
- Back navigation from venue search preserves the summary state.
- Drafts expire after 30 days.
- Invalid or expired drafts are cleared and the customer can start again.
- Questionnaire answers are not placed in URLs.

## Start Over

The `Start over` action opens a confirmation dialog.

- Cancel keeps the current draft and returns focus to the trigger.
- Confirm clears the local draft and pending-save intent, resets the wizard to Event Basics, and returns focus to the heading.
- The dialog supports keyboard focus looping and Escape.

## Authentication And Registration Handoff

Anonymous customers can press `Save event plan` from the Event Plan Summary.

If the customer is not authenticated:

- The current valid draft is saved locally.
- A pending-save intent is written with a stable draft fingerprint.
- The customer is redirected to `/login?redirectTo=%2Fplan-event`.
- The redirect URL does not contain questionnaire answers.

After authentication, `/plan-event` reloads the local draft and pending-save intent. If the draft fingerprint still matches, the plan is saved to the customer account.

Current verification note:

- Anonymous redirect and URL privacy are browser-verified.
- Real registration email-confirmation return is implemented but not live-browser verified.
- Real login return with account save is covered by unit/action contracts, but remains unverified in a live authenticated browser session.

## Account Persistence

Authenticated saves use server actions and the `event_plans` table. Persisted plans include the structured questionnaire data, title, status, source draft fingerprint, and customer ownership.

Behavior:

- First authenticated save creates an account plan.
- After an account plan exists, changes autosave after 900ms.
- Duplicate saves are protected by the source draft fingerprint.
- If save fails, the local draft and pending-save state are kept so the customer can retry.
- Successful account save clears local draft and pending-save data.

## Venue Search Handoff

`Find matching venues` maps only supported questionnaire answers to `/venues` search parameters.

Mapped answers:

- Event type to `event`.
- Province to `province`.
- City or municipality to `city`.
- Expected guest count to `capacity`.
- Supported venue styles to `venueTypes`.
- Indoor/outdoor setting to `indoorOutdoor`.
- Supported amenities to `amenities`.
- Sort defaults to `recommended`.

Intentionally unsupported search mappings:

- Date preferences.
- Preferred date range, month, year, day, and time.
- Nearby-location preference.
- Guest-count range when no exact expected guest count is provided.
- Budget preference and custom budget fields.
- Ranked priorities.
- Additional requirements.
- Service needs and custom service.
- Package preference.
- Accredited supplier preference.
- Payment preference.
- Booking urgency.
- Decision maker.
- Venue styles that do not map to existing venue marketplace filters.
- Amenities that do not map to existing venue marketplace filters.

The total-event-budget fields are intentionally not mapped to venue pricing because customer event budget is not the same as venue base price.

Unsupported criteria remain stored in the event plan for later customer use and future phases.

## Accessibility And Responsive Behavior

Verified behavior:

- One visible heading per active step.
- Labeled fields, fieldsets, and legends for choice groups.
- Error messages connect to fields and invalid fields receive focus.
- Step navigation moves focus predictably.
- Summary edit returns focus to the edited summary section.
- Save status uses restrained live-region messaging.
- Start Over dialog has modal semantics, focus loop, Escape, and focus return.
- Browser axe smoke test passes on the first step.
- No horizontal overflow at 1440, 1280, 1024, 768, 390, and 360px widths.

Implemented but not separately automated in this pass:

- 200% zoom behavior.
- Reduced-motion preference behavior.

## Phase 1 Boundaries

Phase 1 does not:

- Modify `/account/event-planner`.
- Generate AI event plans.
- Generate fake matching percentages.
- Claim venue availability.
- Claim supplier availability.
- Save anonymous plans to the database.
- Expose private event plans publicly.
- Map total event budget into venue price filters.
