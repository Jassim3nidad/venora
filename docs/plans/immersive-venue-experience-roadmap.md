# Immersive Venue Experience Roadmap

Phase: 2.1 Immersive Venue Experience Audit
Planning date: 2026-07-31
Status: proposal for stakeholder review

## 1. Product Vision

Venora's public venue page should become a credible venue microsite inside the marketplace. It should help customers understand the property, imagine their event, compare spaces and packages, evaluate practical constraints, and choose a next step without leaving Venora.

The future journey:

Event Plan -> Venue discovery -> Immersive venue page -> Explore spaces, packages, suppliers, and real event context -> Understand fit -> Inquire, schedule a visit, request availability, or book.

## 2. Goals

- Help customers answer whether a venue fits their event plan.
- Make venue spaces, capacities, logistics, packages, and media structured and comparable.
- Give venue owners a guided authoring tool instead of relying on long unstructured descriptions.
- Keep trust, reviews, availability, pricing, and owner profile context visible.
- Support immersive media progressively without making advanced media mandatory.
- Preserve marketplace consistency, security, RLS, accessibility, and performance.

## 3. Non-Goals

- No pixel-copying benchmark websites.
- No new implementation in Phase 2.1.
- No numeric venue match score.
- No AI-generated compatibility claims.
- No requirement that every venue upload video or 360 tours.
- No unmoderated real-event stories.
- No direct total-price promises before pricing semantics are normalized.
- No migration repair of unrelated historical drift as part of this roadmap.

## 4. Customer Outcomes

Customers should be able to:

- Understand the venue's mood, spaces, capacity, location, packages, and restrictions.
- See which spaces could support ceremony, reception, preparation, dining, backup, or corporate flow.
- Understand what is included in packages and which suppliers may participate.
- See practical logistics before committing.
- Know whether their Event Plan aligns with deterministic venue facts.
- Choose an appropriate next step: inquire, schedule a visit, check availability, or book.

## 5. Venue-Owner Outcomes

Venue owners should be able to:

- Maintain a structured venue profile without developer help.
- Add spaces, capacities, media, logistics, packages, FAQs, and policies.
- Preview the public venue page before publishing.
- Understand profile completeness.
- Publish changes safely through a controlled workflow.
- Avoid misleading customers by entering validated capacity, pricing, and availability data.

## 6. Product Principles

1. Venue page as microsite: the page can be rich, but it must still feel like Venora.
2. Inspire before commitment: customers need context before aggressive booking prompts.
3. Structured data over long marketing text: details must be searchable, comparable, reusable, and validatable.
4. Spaces are first-class entities: a property can contain several event spaces with different roles.
5. Progressive media enhancement: Level 1 images, Level 2 video walkthroughs, Level 3 360 tours.
6. Event Plan personalization must be truthful: explain matching facts without fake scores.
7. Practical information is part of the experience: logistics and rules are not secondary.
8. Mobile usability cannot depend on animation.
9. Owners need structured authoring tools.
10. Media ownership, consent, and moderation matter.
11. Smaller venues must not be punished for not having premium media.
12. Public trust claims must come from verified product data.

## 7. Proposed Information Architecture

| Section | Customer question answered | Required data | Existing data | Missing data | Owner editing requirement | Scope | Mobile behavior | Accessibility and performance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Immersive hero | What does it feel like? | Cover media, venue name, location, rating, CTAs | Venue name, images, reviews, location | Better hero media grouping | Select cover, tagline, featured media | MVP | Compact stacked hero | Optimized image, no autoplay requirement |
| Quick facts | Can it fit my event basics? | Capacity, setting, price, location, amenities | Capacity, setting, price, amenities | Space-level facts | Validate core facts | MVP | 2-column fact chips | Text labels beyond icons |
| Event Plan fit | Why might it work for me? | Customer plan plus venue facts | Event Plan mapper, venue facts | Space/package detail for deeper fit | No owner editing beyond facts | MVP | Compact accordion | No numeric score |
| Property overview | What is this venue? | Description, property summary | Description, AI overview | Structured highlights | Overview editor | MVP | Readable text width | Semantic headings |
| Explore spaces | Which spaces would I use? | Venue spaces, media, capacity, roles | None | Space model | Spaces editor | MVP | Cards/list with detail drawers | Keyboard navigable |
| Event type view | Can I imagine my event here? | Event types, space recommendations | Event type relation exists | Owner event-flow content | Event type/flow editor | MVP | Scroll sections | Avoid motion dependency |
| Your day at venue | What would the flow be? | Suggested sequence, spaces, logistics | None | Event-flow content | Guided event-flow fields | Enhanced | Timeline/list | Plain text alternative |
| Packages | What can I book? | Packages, inclusions, price, terms | Package tables | Space/package relationship | Package editor extension | MVP | Compare cards | Avoid horizontal overflow |
| Accredited suppliers | Who may support my event? | Active agreements, package suppliers | Supplier agreements and package suppliers | Public display model | Supplier visibility controls | Enhanced | Compact list | Supplier links accessible |
| Real event stories | Has this worked before? | Showcase, media, consent, suppliers | Reviews only | Showcase model | Showcase editor and consent | Enhanced | Story cards | Consent and alt text |
| Accommodations | Can guests stay or prepare here? | Room types, capacity, amenities | Boolean only | Accommodation model | Accommodation editor | Enhanced | Cards with filters | Hide if unsupported |
| Dining | What food/drink options exist? | Dining options, menus, rules | Text inclusions only | Dining model | Dining editor | Enhanced | Simple sections | Avoid inaccessible PDFs |
| Gallery/video/360 | Can I explore visually? | Grouped media, video, 360 embed | Images/video | Collections, embeds | Media manager | Enhanced/Advanced | Lazy-loaded gallery | Captions/fallbacks |
| Logistics/map | How do people arrive and move? | Directions, parking, backup, curfew | Address, map, booleans, rules | Structured logistics | Logistics editor | MVP | Accordion/detail list | Map fallback text |
| Reviews/trust | Can I trust it? | Reviews, owner profile, completed bookings | Reviews, owner profile | Awards/certs if supported later | Owner response workflow | MVP | Compact summary | Verified labels with text |
| FAQs/policies | What are the rules? | FAQs, policies, rules | Rules/cancellation text | FAQ model | FAQ editor | MVP | Accordion | Keyboard-safe controls |
| Next actions | What should I do next? | Booking, inquiry, site visit | Booking/inquiry | Site visit workflow | Visit availability editor | MVP/enhanced | Sticky compact footer | No content overlap |

## 8. Conceptual Domain Model

These are conceptual entities only. They are not SQL definitions.

### VenueSpace

- Purpose: represent an event-usable space within a venue.
- Parent: venue.
- Important fields: name, slug, type, description, indoor_outdoor, capacity_min, capacity_max, dimensions, accessibility notes, restrictions, display_order, status.
- Publication state: draft and published via venue profile publication.
- Media relationship: one or more media collections.
- RLS boundary: organization members can manage spaces for owned venues; public reads published spaces only.
- Validation: capacity cannot exceed venue-level max without explicit warning.
- MVP: required.

### VenueSpaceCapacityLayout

- Purpose: record capacity by layout, such as banquet, theater, classroom, cocktail, ceremony, or boardroom.
- Parent: VenueSpace.
- Important fields: layout_type, guest_capacity, notes, display_order.
- RLS boundary: inherited from venue.
- Validation: positive guest capacity, controlled layout values.
- MVP: optional; can ship later if scope needs reduction.

### VenueSpaceAmenity

- Purpose: connect amenities to specific spaces.
- Parent: VenueSpace and amenity.
- Important fields: amenity_id, custom_label, notes.
- RLS boundary: inherited from venue.
- Validation: known amenity or safe custom label.
- MVP: useful but can be deferred if venue-level amenities are enough.

### VenueMediaCollection

- Purpose: group media by hero, gallery, space, accommodation, dining, showcase, or logistics.
- Parent: venue or child content entity.
- Important fields: title, type, owner_entity_type, owner_entity_id, display_order, is_public.
- RLS boundary: inherited from venue and owning entity.
- Validation: controlled collection types.
- MVP: required for space galleries.

### VenueMediaItem

- Purpose: represent images, videos, floor plans, and approved external embeds.
- Parent: VenueMediaCollection.
- Important fields: storage_path, media_type, external_url, provider, alt_text, caption, transcript, display_order, is_featured, moderation_status.
- RLS boundary: owner writes, public reads published/approved items.
- Validation: MIME checks, URL allowlists, size limits, required alt text for images.
- MVP: required for images; video/360/floor plans later.

### VenueAccommodationType

- Purpose: describe stay or preparation-room options.
- Parent: venue.
- Important fields: name, description, sleeps, bed_configuration, room_size, amenities, price_context, check_in, check_out, package_inclusion_notes, display_order.
- RLS boundary: inherited from venue.
- Validation: avoid direct inventory promises unless tied to booking system.
- MVP: not required.

### VenueDiningOption

- Purpose: describe restaurant, catering, bar, breakfast, and food rules.
- Parent: venue.
- Important fields: name, type, description, menu_summary, dietary_support, bar_service, external_caterer_policy, package_notes.
- RLS boundary: inherited from venue.
- Validation: avoid unverified price/menu claims.
- MVP: not required.

### VenueEventShowcase

- Purpose: publish real-event stories with consent.
- Parent: venue.
- Important fields: title, event_type_id, guest_count, event_date_month, spaces_used, suppliers_used, style_tags, testimonial, consent_status, moderation_status, featured.
- RLS boundary: owner creates; public reads approved published showcase only.
- Validation: no customer-identifying details without consent.
- MVP: not required.

### VenueEventShowcaseSupplier

- Purpose: connect showcases to suppliers.
- Parent: VenueEventShowcase and supplier profile.
- Important fields: supplier_id, role_label, public_visible.
- RLS boundary: venue owner and supplier visibility rules.
- Validation: supplier must be active or historical display must be explicit.
- MVP: not required.

### VenueFAQ

- Purpose: answer repeat customer questions.
- Parent: venue.
- Important fields: question, answer, category, display_order, is_public.
- RLS boundary: inherited from venue.
- Validation: answer length and safe content.
- MVP: required.

### VenueLogistics

- Purpose: store structured practical details.
- Parent: venue.
- Important fields: parking_details, directions, landmark_notes, curfew, noise_policy, setup_rules, teardown_rules, weather_backup, accessibility_details, pet_policy, supplier_policy.
- RLS boundary: inherited from venue.
- Validation: prevent contradictory rules.
- MVP: required.

### VenueVirtualTour

- Purpose: controlled 360 or external virtual-tour links.
- Parent: venue or space.
- Important fields: provider, url, title, fallback_description, is_public, moderation_status.
- RLS boundary: inherited from venue.
- Validation: provider allowlist, no raw embed HTML.
- MVP: not required.

### VenueFloorPlan

- Purpose: floor-plan image/PDF with accessible description.
- Parent: venue or space.
- Important fields: storage_path, file_type, title, alt_text, caption, display_order.
- RLS boundary: inherited from venue.
- Validation: file type and size checks.
- MVP: not required.

### VenueProfilePublication

- Purpose: snapshot and publish structured venue content safely.
- Parent: venue.
- Important fields: draft_payload or normalized snapshot reference, published_at, published_by, status, review_notes.
- RLS boundary: owner/coordinator manage, public reads published content.
- Validation: required-section checks before publish.
- MVP: required.

## 9. Owner Editor Concept

Recommended editor structure:

- Overview.
- Spaces.
- Capacity and layouts.
- Media.
- Event types.
- Packages.
- Logistics.
- FAQs and policies.
- Suppliers.
- Accommodations.
- Dining.
- Event showcases.
- Preview and publish.

Required MVP sections:

- Overview.
- Spaces.
- Media.
- Capacity.
- Packages.
- Logistics.
- FAQs and policies.
- Preview and publish.

Optional MVP sections:

- Supplier public visibility.
- Event Plan fit preview.

Later sections:

- Accommodations.
- Dining.
- Event showcases.
- Floor plans.
- 360 tours.

Behavior:

- Draft editing should not immediately alter the public venue page.
- Publish should validate required sections and warn about weak content.
- Preview should render the future public layout using draft data.
- Completion indicators should separate required data from enhancement suggestions.
- Autosave can be considered after the initial structured editor is stable.
- Coordinators can edit assigned venue content only when existing permissions allow it.
- Admin moderation may be required for external embeds, real-event stories, and public claims.

## 10. Public Venue-Page Concept

MVP public page:

1. Immersive hero with media, name, rating, location, primary facts, and CTAs.
2. Quick facts and availability context.
3. Event Plan fit explanation when a customer has plan context.
4. Property overview.
5. Explore spaces.
6. Packages.
7. Logistics and map.
8. FAQs and policies.
9. Reviews and owner trust.
10. Inquiry, site-visit request, and booking actions.

Later public modules:

- Real event stories.
- Accommodation and dining.
- Supplier spotlights.
- Floor plans and property maps.
- Video walkthrough and 360 tours.
- Advanced package customization.

## 11. Event Plan Personalization Concept

Allowed copy patterns:

- Supports your expected guest count.
- Located in your preferred city or province.
- Offers your preferred indoor/outdoor setting.
- Supports your selected event type.
- Includes required parking.
- Provides wheelchair accessibility.
- Offers accommodation, when structured venue data supports it.
- Includes your required supplier/service category, when active agreements support it.

Unsupported criteria should remain visible but not affect fit claims:

- Budget until pricing semantics are normalized.
- Style/mood until venue style tags are structured.
- Event flow until spaces are structured.
- Supplier preference until package/supplier display is reliable.
- Dining and accommodation preferences until those models exist.

Do not use:

- Numeric match percentages.
- AI-generated deterministic claims.
- Guaranteed availability claims without live date validation.

## 12. MVP Scope

MVP should include:

- Structured venue spaces.
- Space galleries.
- Venue media collections.
- Redesigned hero powered by structured data.
- Quick facts.
- Capacity details.
- Event type display.
- Packages with clearer inclusions.
- Logistics and FAQs.
- Event Plan fit explanations using safe deterministic comparisons.
- Inquiry and site-visit CTAs.
- Owner structured editor.
- Draft, preview, publish.
- RLS and public-read boundaries.
- Accessibility and mobile verification.

MVP should not include:

- Full accommodation catalog.
- Dining catalog.
- Real-event showcase gallery.
- 360 tour embed system.
- Interactive property map.
- Advanced package customizer.
- Recommendation ranking.

## 13. Enhanced Scope

Enhanced scope can include:

- Accommodation types.
- Dining options.
- Supplier visibility in packages.
- Event showcases with consent.
- Floor plans.
- Property maps.
- Video walkthrough improvements.
- Owner response/trust enhancements.
- More complete Event Plan criteria visibility.

## 14. Advanced Scope

Advanced scope can include:

- 360 virtual tours.
- Hotspots.
- Interactive property maps.
- Layout visualization.
- Before/after styling inspiration.
- Recommendation ranking.
- Advanced package customization.
- Deeper supplier orchestration.

## 15. Phase 2.2-2.10 Roadmap

### Phase 2.2 - Structured Venue Foundation

- Goal: design schema, contracts, RLS, validation, and repositories for spaces, media collections, logistics, FAQs, and publications.
- Dependencies: stakeholder approval for domain model and MVP scope.
- Deliverables: migration plan, data contracts, RLS tests, repository tests, migration dry-run notes.
- Security: owner/org scoping, public read for published content only, no service-role client usage.
- Testing: database contract tests, RLS ownership tests, repository tests.
- Exit criteria: normalized model approved and covered by tests.
- Complexity: large.
- Risks: overengineering, migration drift, unclear publication model.

### Phase 2.3 - Venue-Owner Content Editor

- Goal: build structured owner editor for MVP content.
- Dependencies: Phase 2.2 contracts.
- Deliverables: spaces editor, media collection manager, logistics/FAQ editor, preview/publish workflow, validation messages.
- Security: owner/coordinator permission checks for assigned venues.
- Testing: component tests, server-action tests, browser workflow tests.
- Exit criteria: owner can author and publish a complete structured venue profile.
- Complexity: large.
- Risks: editor complexity, incomplete drafts, confusing validation.

### Phase 2.4 - Public Immersive Venue Profile

- Goal: render the public page from structured data.
- Dependencies: Phase 2.2 and 2.3 published data.
- Deliverables: hero, quick facts, spaces explorer, packages, logistics, FAQs, trust, CTAs.
- Security: public reads only published data.
- Testing: route tests, browser tests, accessibility checks, responsive checks.
- Exit criteria: published profile is usable at desktop, tablet, and mobile sizes.
- Complexity: large.
- Risks: performance, layout bloat, missing fallback states.

### Phase 2.5 - Galleries and Event Showcases

- Goal: add grouped galleries and consent-safe real-event stories.
- Dependencies: media collections and moderation decisions.
- Deliverables: gallery groups, showcase editor, consent fields, public showcase module.
- Security: consent and moderation boundaries.
- Testing: media upload tests, moderation state tests, browser gallery tests.
- Exit criteria: public pages never expose unpublished/unapproved showcase content.
- Complexity: medium-large.
- Risks: consent gaps, misleading event representation.

### Phase 2.6 - Accommodation and Dining

- Goal: model and display stay and dining context.
- Dependencies: stakeholder decision that these are in scope.
- Deliverables: accommodation editor, dining editor, public modules, package relationship notes.
- Security: owner-only edits, public published reads.
- Testing: validation tests and public fallback tests.
- Exit criteria: venues without accommodation or dining remain clean and compact.
- Complexity: medium.
- Risks: inaccurate inventory, menu staleness.

### Phase 2.7 - Video and Virtual Tours

- Goal: improve video presentation and add safe virtual-tour support.
- Dependencies: provider allowlist and media moderation plan.
- Deliverables: video poster/fallback, external tour entity, accessible fallback, lazy loading.
- Security: external URL sanitization, no raw HTML embeds.
- Testing: URL validation tests, accessibility fallback tests, performance checks.
- Exit criteria: unsupported tour providers are rejected safely.
- Complexity: medium.
- Risks: slow pages, broken embeds, XSS risk.

### Phase 2.8 - Event Plan Personalization

- Goal: add truthful deterministic venue-fit explanations.
- Dependencies: structured venue data.
- Deliverables: fit explanation component, unsupported criteria display, tests.
- Security: customers see only their own Event Plan context.
- Testing: mapper tests, auth/ownership tests, browser checks.
- Exit criteria: no fake score and no unsupported claim.
- Complexity: medium.
- Risks: misleading compatibility copy.

### Phase 2.9 - Package and Supplier Context

- Goal: explain package spaces, suppliers, optional services, and customization.
- Dependencies: package-to-space decision and supplier visibility rules.
- Deliverables: package detail improvements, supplier display module, optional-service model if approved.
- Security: only active agreements are shown publicly.
- Testing: package/supplier query tests, RLS tests, browser checks.
- Exit criteria: customers can understand inclusions without price ambiguity.
- Complexity: medium-large.
- Risks: supplier relationship ambiguity, pricing confusion.

### Phase 2.10 - Final QA and Release

- Goal: production-quality release verification.
- Dependencies: all selected phases complete.
- Deliverables: accessibility report, performance report, security report, browser QA, release checklist.
- Security: RLS matrix and storage policy verification.
- Testing: type-check, build, unit tests, integration tests, browser E2E, database contracts.
- Exit criteria: stakeholder signoff and release checklist complete.
- Complexity: medium.
- Risks: late UX defects, mobile performance, live-data migration issues.

## 16. Dependencies

- Customer Event Planning Phase 1 remains available for future personalization.
- Supabase schema and RLS must be designed before public immersive UI.
- Existing package/supplier work should be reconciled with the final venue content model.
- Business profile publication patterns should inform, but not replace, venue profile publication.
- Storage path-scoped ownership rules should be reused for new media entities.

## 17. Risk Register

| Risk | Likelihood | Impact | Mitigation | Phase |
| --- | --- | --- | --- | --- |
| Media storage growth | High | Medium | Limits, compression, cleanup, usage monitoring | 2.2, 2.7 |
| Slow public venue pages | High | High | Lazy load media, optimize hero, cap first-load modules | 2.4 |
| Unoptimized video | Medium | High | Poster images, size limits, no autoplay, future transcoding decision | 2.7 |
| Malicious external embeds | Medium | High | Provider allowlist, no raw embed HTML, URL validation | 2.7 |
| Broken 360-tour links | Medium | Medium | Health checks, fallback descriptions, owner warnings | 2.7 |
| Owner content inconsistency | High | Medium | Structured validation and preview | 2.3 |
| Misleading capacities | Medium | High | Capacity validation and publication warnings | 2.2, 2.3 |
| Stale pricing | High | High | Price effective dates and clear price context | 2.9 |
| Unverified availability | Medium | High | Keep live availability checks at booking step | 2.4 |
| Unsupported expectations | Medium | Medium | Mark unsupported Event Plan criteria separately | 2.8 |
| Fake event galleries | Medium | High | Consent and moderation status | 2.5 |
| Missing photo consent | Medium | High | Consent fields before publication | 2.5 |
| Cross-venue media access | Low | High | Path-scoped policies and RLS tests | 2.2 |
| Supplier ambiguity | Medium | Medium | Show only active agreements and package suppliers | 2.9 |
| Package-price ambiguity | High | High | Avoid total-cost claims until semantics are normalized | 2.9 |
| Accessibility failures | Medium | High | Semantic components, keyboard tests, reduced-motion handling | 2.4, 2.7 |
| Mobile performance | High | High | Mobile-first QA and media budgets | 2.4, 2.10 |
| SEO duplication | Medium | Medium | Canonicals and structured metadata per venue | 2.4 |
| Overly complex editor | High | Medium | Required/optional sections and progressive disclosure | 2.3 |
| Schema overengineering | Medium | High | MVP-first normalized model, bounded JSON only | 2.2 |
| Migration drift | Medium | High | Avoid repairing unrelated drift; test new migrations in isolation | 2.2 |
| Moderation workload | Medium | Medium | Restrict moderation to embeds/showcases/high-risk claims first | 2.5, 2.7 |

## 18. Testing Strategy

- Unit tests for mappers, validators, and domain helpers.
- Repository tests for venue spaces, media collections, logistics, FAQs, publications.
- Database contract tests for new schema and uniqueness constraints.
- RLS tests for owner, coordinator, customer, anonymous, and admin behavior.
- Server-action tests for create/update/publish flows.
- Browser E2E for owner authoring, preview, publish, public page, inquiry, booking, and Event Plan context.
- Accessibility checks for keyboard, headings, focus states, labels, reduced motion, and color contrast.
- Responsive checks at desktop, tablet, mobile, and narrow mobile.
- Performance checks for hero image, gallery, video, map, and route bundle size.

## 19. Security Strategy

- Public users read only published venue-profile data.
- Venue owners and authorized coordinators manage only venues they own or are assigned to.
- Media writes remain path-scoped by organization and venue.
- External embeds use allowlisted providers and sanitized URLs only.
- Real-event content requires publication consent and moderation state.
- Supplier claims come only from active supplier agreements or package supplier links.
- Customer Event Plan context is private and should never be exposed to venue owners through public page personalization.

## 20. Accessibility Strategy

- One visible `h1` for venue name.
- Semantic section headings.
- Alt text and captions for public media.
- Keyboard-accessible gallery, accordions, tabs, and modals.
- Reduced-motion support for animated or immersive sections.
- Text fallback for 360 tours, maps, and videos.
- No color-only status communication.
- Touch targets around 44px minimum.
- No horizontal scrolling on mobile.

## 21. Performance Strategy

- Optimize and lazy-load non-hero media.
- Prefer static image previews before video or 360 content.
- Defer maps, carousels, and virtual tours until interaction or viewport.
- Limit initial public page queries.
- Avoid loading every space gallery up front.
- Use placeholders that match final layout.
- Add media budgets before advanced immersive phases.

## 22. Rollout Strategy

1. Design and ship schema behind no public UI change.
2. Enable owner editor for internal/test venues.
3. Publish structured profile preview for selected venues.
4. Release public immersive page to a small set of venues.
5. Monitor performance, inquiries, bookings, and owner completion.
6. Expand to all venue owners after QA and support documentation.

## 23. Migration Considerations

- Keep new migrations focused on structured venue profile data.
- Do not repair unrelated historical migration drift in the same phase.
- Add RLS tests before relying on public reads.
- Use existing organization ownership model.
- Avoid one table per minor copy block.
- Avoid unrestricted JSON for critical searchable/comparable data.
- Bounded JSON can be used for display preferences or validated layout metadata.
- Backfill should be safe for existing venues with empty structured profiles.

## 24. Open Decisions Requiring Stakeholder Approval

- MVP must include first-class spaces or use a lighter venue-section model.
- Whether site-visit scheduling is part of MVP or just an inquiry CTA.
- Whether accommodation and dining belong in Enhanced or MVP for resort-style venues.
- Whether owner publication requires admin moderation or self-publishing with audit logs.
- Which external virtual-tour providers are allowed.
- Whether package pricing should show starting price, range, or package total.
- How supplier visibility should work when package suppliers are attached.
- Whether real event showcases require customer approval inside Venora or offline consent record.

## 25. Acceptance Criteria for Starting Phase 2.2

- Stakeholders approve MVP scope.
- Stakeholders approve first-class spaces as the foundation.
- Stakeholders approve publication workflow direction.
- Security owner approves RLS boundaries.
- Product approves Event Plan fit copy rules and no numeric match scores.
- Media owner approves progressive media model and external embed policy.
- Engineering agrees on migration strategy and no unrelated drift repair.
- QA agrees on RLS, browser, accessibility, and performance verification matrix.

## 26. Decision Log

| Decision | Evidence | Alternatives considered | Trade-offs | Recommended choice | Approval required |
| --- | --- | --- | --- | --- | --- |
| Spaces as first-class entities | Benchmarks expose multiple spaces; Venora has only venue-level fields. | Long description, JSON blob, reusable content sections. | More schema and editor work, but searchable and comparable. | Create first-class VenueSpace model. | Yes |
| Image/video/360 progressive model | Venora supports images/video; 360 absent. | Require advanced media for publication. | Optional media preserves smaller venues. | Images MVP, video later, 360 advanced. | Yes |
| Accommodation scope | Hillcreek/Biltmore show lodging value; Venora has only boolean. | Include in MVP for all venues. | MVP would grow too much. | Enhanced phase unless venue category requires it. | Yes |
| Dining scope | Benchmarks integrate dining; Venora lacks model. | Store in package text only. | Structured dining helps resorts but not every venue. | Enhanced phase with optional model. | Yes |
| Event showcase scope | Real-event stories build trust; no consent model exists. | Use reviews only. | Showcases need moderation. | Enhanced phase after consent design. | Yes |
| Property-map scope | Biltmore uses orientation; Venora has map coordinates. | Use existing map only. | Interactive map is high effort. | MVP basic logistics/map, later property map. | Yes |
| External embeds versus uploads | 360 tours need embeds; raw embeds are risky. | Allow arbitrary iframe HTML. | Allowlist limits flexibility but protects users. | Allowlisted URLs only, no raw HTML. | Yes |
| Event Plan personalization | Mapper already supports deterministic venue-search filters. | AI scoring, match percentages. | Plain explanations are less flashy but safer. | Deterministic fact explanations only. | Yes |
| Match scores | Budget/style/services lack reliable structured comparison. | Numeric percentage score. | Scores may mislead customers. | No numeric match score in MVP. | Yes |
| Owner publishing workflow | Business profiles already use publication snapshots; venues edit live fields. | Immediate public updates. | Publication adds complexity but prevents incomplete public pages. | Draft/preview/publish for structured venue profile. | Yes |
| Package-to-space relationship | Packages currently attach to venue only. | Keep packages venue-level forever. | Space links improve clarity but require schema. | Add package-space relationship in foundation. | Yes |
| Supplier-to-package relationship | `package_suppliers` exists. | Show all venue suppliers. | Package-level supplier context is more accurate. | Publicly show suppliers only when package/active agreement supports it. | Yes |
| Pricing display | Current base/package price semantics vary. | Show total event cost. | Total claims may be inaccurate. | Show starting/package context and avoid total claims until normalized. | Yes |
| Availability claims | Calendar checks live date availability. | Market a date as available without date check. | Live validation is required to avoid double booking. | Keep availability claims date-specific and validated. | Yes |
| Site-visit scheduling | Benchmarks use ocular/site-visit CTAs; Venora has inquiry. | Build full scheduler now. | Scheduler requires availability and workflow design. | MVP site-visit request CTA, scheduling later if approved. | Yes |
