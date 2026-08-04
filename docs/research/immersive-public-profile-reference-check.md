# Immersive Public Venue Profile Reference Check

Date researched: 2026-08-01
Phase: 2.4 Pre-Implementation Reference Check
Branch: `feature/immersive-public-venue-profile`
Classification: Complete with inaccessible-page limitations

## 1. Research Scope

This reference check validates the approved Cinematic Editorial Luxury direction for Venora's public `/venues/[slug]` experience. It compares the supplied design direction, three official venue websites, the current Venora page, and the structured venue foundation already present in the repository.

The goal is to extract principles, not assets or implementation. No source wording, imagery, logos, colors, font files, HTML, CSS, JavaScript, prices, testimonials, or venue claims may be copied.

Reference priority used:

1. Approved Venora Cinematic Editorial Luxury direction
2. Lazuri Tagaytay for emotion and scrolling rhythm
3. Hillcreek Gardens Tagaytay for local content completeness
4. Biltmore Estate for editorial hierarchy and venue storytelling

### Method

- Opened every supplied official reference URL in a browser.
- Inspected visible desktop structure and mobile behavior where practical.
- Recorded section order, CTA hierarchy, media treatment, typography, interaction, accessibility, and performance risks.
- Inspected the current Venora route and the repository files that provide its data and presentation.
- Compared recommendations with the Phase 2.3 structured venue aggregate so draft or unsupported content is not proposed for publication.

### Evidence limitations

- No discrete mockup image was available in the task payload or attachment directory. The approved mockup analysis therefore uses the detailed visual direction supplied in the task as the highest authority. This document does not claim a missing image was visually inspected.
- The current Venora page was successfully inspected at desktop width. At 390 x 844, the final local route remained in its `Loading venue details...` state during the bounded check, so the loaded mobile page is not claimed as verified here.
- All supplied official reference URLs were successfully opened. Media occasionally appeared after the surrounding text and layout, which is recorded as a performance observation rather than an access failure.

## 2. Pages Inspected

### Official references

Lazuri Tagaytay:

- https://www.lazurihotels.com/

Hillcreek Gardens Tagaytay:

- https://www.hillcreekgardenstagaytay.com/
- https://www.hillcreekgardenstagaytay.com/venues/
- https://www.hillcreekgardenstagaytay.com/events/
- https://www.hillcreekgardenstagaytay.com/rooms-accomodations/
- https://www.hillcreekgardenstagaytay.com/dining/
- https://www.hillcreekgardenstagaytay.com/360-tour/

Biltmore Estate:

- https://www.biltmore.com/weddings/
- https://www.biltmore.com/weddings/venues/
- https://www.biltmore.com/wedding-venue/biltmore-house-gardens/
- https://www.biltmore.com/wedding-venue/the-inn-on-biltmore-estate/

### Current Venora route

- `http://localhost:3000/venues/amorita-resort`

### Current Venora repository evidence

- `apps/web/app/(customer)/venues/[slug]/page.tsx`
- `apps/web/src/features/venues/ui/VenueDetails.tsx`
- `apps/web/src/features/venues/ui/VenueGallery.tsx`
- `apps/web/src/features/venues/ui/BookingSidebar.tsx`
- `apps/web/src/features/venues/ui/ReviewsSection.tsx`
- `apps/web/src/features/venues/ui/VenuePromotionalVideo.tsx`
- `apps/web/src/features/venues/ui/VenueMobileBookingBar.tsx`
- `apps/web/src/components/VenueMap.tsx`
- `apps/web/src/features/venues/application/structured-profile-repository.ts`
- `apps/web/src/features/venues/domain/structured-venue.types.ts`
- `apps/web/src/features/venues/utils/venue-media.ts`
- `apps/web/src/features/venues/utils/venue-mappers.ts`
- `apps/web/app/(venue-owner)/dashboard/venues/[id]/experience/preview/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/venues/[id]/experience/preview/preview-actions.tsx`

## 3. Approved Venora Direction Analysis

The following analysis is based on the supplied design specification because the referenced image asset was unavailable.

1. **Pages successfully inspected:** No separate mockup page or image was available; the task's approved direction was inspected as the design specification.
2. **First impression:** Premium, cinematic, and emotionally useful, while remaining a trustworthy marketplace page.
3. **Hero composition:** Real venue photography by default; muted published video may enhance it. Identity, location, factual quick facts, and restrained actions sit above or adjacent to the media without a large form covering it.
4. **Typography:** Editorial scale and pacing using Venora's existing font system. The venue name is the single `h1`; display scale is reserved for the hero.
5. **Color and contrast:** Warm imagery, restrained dark overlays, neutral content surfaces, and Venora blue for decisions.
6. **Image treatment:** Real published venue media, intentional crops, stable aspect ratios, captions where useful, and no invented destination imagery.
7. **Section rhythm:** Emotion first, then fit, spaces, experiences, packages, logistics, trust, and decisions.
8. **Venue-space presentation:** Published spaces become the primary way to understand the property instead of being flattened into one description.
9. **Event-type presentation:** Multiple Venora event types are supported only when the venue's structured relationships support them.
10. **Package presentation:** Packages explain the real spaces and services included and retain existing booking or inquiry actions.
11. **Practical information:** Logistics remain complete but appear after the customer can picture the event.
12. **CTA hierarchy:** Explore first; inquire or request availability when interested; use the existing booking flow when ready.
13. **Mobile behavior:** Deliberate mobile composition, compact hero content, stacked controls, and a restrained safe-area action bar.
14. **Accessibility strengths:** The direction can preserve semantic content order, readable overlays, keyboard interaction, and reduced motion.
15. **Accessibility weaknesses:** Cinematic media becomes harmful if controls, contrast, focus, captions, or motion preferences are omitted.
16. **Performance strengths:** A poster-first approach can deliver the emotional opening before optional video initializes.
17. **Performance risks:** Full-bleed images, video, galleries, maps, and recommendation content can compete for bandwidth and main-thread time.
18. **Applicable Venora principles:** Emotional visualization, structured truth, progressive disclosure, multiple decision stages, and marketplace consistency.
19. **Patterns inappropriate for Venora:** A bespoke single-property microsite, fake match scores, invented journey details, or a hero dominated by a booking form.
20. **Copying risks:** A missing image prevents pixel comparison; implementation must follow the stated principles and Venora tokens rather than recreate an assumed screenshot.

## 4. Lazuri Analysis

1. **Pages successfully inspected:** Lazuri's official home page.
2. **First impression:** A highly visual destination experience built around anticipation, scenery, and celebration.
3. **Hero composition:** Near-full-viewport photography, compact navigation, a short emotional headline, and two early decisions.
4. **Typography:** Large display text and concise supporting copy create a strong opening hierarchy.
5. **Color and contrast:** Media supplies most color; overlays and light text carry the hero.
6. **Image treatment:** Full-width photography, image-led transitions, video, sliders, and rich scene changes.
7. **Section rhythm:** Hero, quick facts, visual story, event choices, spaces, space comparison, packages, tours, process, FAQs, social proof, and inquiry.
8. **Venue-space presentation:** Signature spaces are compared through setting, view, use, atmosphere, and event moment.
9. **Event-type presentation:** Weddings and milestone celebrations receive distinct narrative paths.
10. **Package presentation:** Packages are prominent and framed as complete experiences.
11. **Practical information:** It appears later than the emotional story and is distributed across packages, process, FAQs, and inquiry.
12. **CTA hierarchy:** Explore packages or the property first, then ocular visit and inquiry.
13. **Mobile behavior:** The image-led hero survives, but the inspected quick-fact area produced horizontal overflow and the long page increases interaction cost.
14. **Accessibility strengths:** Major actions have names and the document exposes recognizable heading structure.
15. **Accessibility weaknesses:** Dense carousels, motion, repeated controls, and horizontally constrained content create keyboard, zoom, and reduced-motion risk.
16. **Performance strengths:** Media creates immediate destination context when its poster arrives promptly.
17. **Performance risks:** Multiple videos, carousels, 3D-like motion, and a large DOM are expensive on mid-range mobile devices.
18. **Applicable Venora principles:** Image-first emotion, fast quick facts, selective space comparison, event-type context, and layered CTA intent.
19. **Patterns inappropriate for Venora:** Wedding-only framing, exact section sequence, heavy scroll effects, external-message-first inquiry, and ocular-visit promises without a workflow.
20. **Copying risks:** Lazuri's imagery, claims, package language, type, brand treatment, motion timings, and layout must not be reproduced.

## 5. Hillcreek Analysis

1. **Pages successfully inspected:** Official home, venues, events, rooms/accommodations, dining, and 360-tour pages.
2. **First impression:** A complete Philippine destination with events, stays, dining, and multiple named spaces.
3. **Hero composition:** Property imagery and destination identity lead; transactional hotel controls appear early on the home page.
4. **Typography:** Conventional hospitality headings and centered descriptive copy favor completeness over dramatic editorial contrast.
5. **Color and contrast:** Light surfaces and property photography dominate; decorative branding occupies meaningful space.
6. **Image treatment:** Each destination category and venue space receives dedicated photography or a carousel.
7. **Section rhythm:** The site branches by destination function rather than presenting one long marketplace listing.
8. **Venue-space presentation:** Named spaces have real descriptions, capacities, images, and inquiry actions.
9. **Event-type presentation:** Weddings, renewals, birthdays, intimate events, and corporate events are treated as separate use cases.
10. **Package presentation:** The inspected pages prioritize spaces and destination services more than a normalized marketplace package comparison.
11. **Practical information:** Capacity, indoor/outdoor context, lodging, dining, and immersive exploration answer local planning questions.
12. **CTA hierarchy:** Book or inquire actions recur across the relevant destination section.
13. **Mobile behavior:** Venue content stacks into a readable single column with a hamburger menu, but narrative sections become long and carousels add effort.
14. **Accessibility strengths:** Content remains legible in a linear mobile flow and space names are explicit.
15. **Accessibility weaknesses:** Some pages begin with visually styled lower-level headings, icon-font controls are unclear, and carousel labeling is weak.
16. **Performance strengths:** Separate pages prevent every destination module from loading into one page.
17. **Performance risks:** Large galleries, embeds, plugins, and the 360 experience can delay media and leave temporary blank regions.
18. **Applicable Venora principles:** Destination mental model, named spaces, capacities, indoor/outdoor facts, event use cases, and Philippine planning context.
19. **Patterns inappropriate for Venora:** Hotel booking widgets, repetitive inquiry controls, property-specific dining/accommodation claims, and mandatory 360 media.
20. **Copying risks:** Space names, destination claims, capacities, images, and local marketing copy belong to Hillcreek and cannot seed Venora data.

## 6. Biltmore Analysis

1. **Pages successfully inspected:** Official weddings overview, venue list, Biltmore House & Gardens detail, and The Inn detail.
2. **First impression:** Calm, premium, factual, and confident rather than visually noisy.
3. **Hero composition:** Full-width destination imagery, a concise title, and minimal competing controls.
4. **Typography:** Strong editorial hierarchy, generous measure, and clear separation of introductory and practical content.
5. **Color and contrast:** Restrained surfaces allow imagery, headings, and factual comparison to carry the page.
6. **Image treatment:** Large photography alternates with focused copy; media is not crowded by forms or badge clusters.
7. **Section rhythm:** Overview, venue choices, individual story, facts, cost context, map, and inquiry.
8. **Venue-space presentation:** Venue cards and a comparison table expose capacity range, setting, and cost context.
9. **Event-type presentation:** The inspected section is wedding-specific, but its narrative method can generalize to other event types.
10. **Package presentation:** Real inclusions and pricing assumptions are explicit instead of hidden behind vague labels.
11. **Practical information:** Capacity, setting, costs, map context, and inquiry are concise and easy to find.
12. **CTA hierarchy:** A restrained inquiry path follows exploration instead of repeating a primary action in every block.
13. **Mobile behavior:** The hero crops cleanly, the title wraps, content becomes a readable single column, and no horizontal overflow was observed.
14. **Accessibility strengths:** Named navigation, one clear page title, links, and factual comparison structure support orientation.
15. **Accessibility weaknesses:** Visual eyebrow text uses low heading levels in places, and image-credit text can interrupt reading flow.
16. **Performance strengths:** Fewer interactive modules and restrained motion reduce client-side complexity.
17. **Performance risks:** Large hero media still appeared after surrounding layout during some checks, showing the need for careful image priority and sizing.
18. **Applicable Venora principles:** Editorial restraint, real space comparison, explicit assumptions, balanced copy and media, and calm inquiry hierarchy.
19. **Patterns inappropriate for Venora:** Wedding-only information architecture, estate-specific map behavior, proprietary type, and fixed destination claims.
20. **Copying risks:** Venora must not reproduce Biltmore's copy, imagery, cost values, inclusions, brand palette, or exact composition.

## 7. Current Venora Analysis

1. **Pages successfully inspected:** `/venues/amorita-resort` at desktop; mobile route shell and loading state at 390 x 844.
2. **First impression:** A capable marketplace detail page with broad factual coverage, but less emotional differentiation than the approved direction.
3. **Hero composition:** Breadcrumb, large name, rating, verification, location, share, and a five-image mosaic behave like a conventional listing.
4. **Typography:** Strong venue title and generally consistent marketplace hierarchy; most later sections receive similar visual weight.
5. **Color and contrast:** Neutral surfaces and Venora blue are clear, though stacked white sections flatten the journey.
6. **Image treatment:** A useful mosaic gallery and promotional-video component already exist, but the opening is not yet cinematic.
7. **Section rhythm:** Gallery and facts lead into description, map, amenities, packages, policies, owner, reviews, recommendations, and footer.
8. **Venue-space presentation:** The structured foundation can publish spaces, capacities, media, practical details, and FAQs, but the current public page does not make spaces the core exploration model.
9. **Event-type presentation:** General venue metadata exists; differentiated event-type experience storytelling is not currently central.
10. **Package presentation:** Packages and comparison already exist, but practical comparison outweighs experiential explanation.
11. **Practical information:** Strong coverage through map, amenities, parking, rules, cancellation, pricing, and booking controls.
12. **CTA hierarchy:** Share, save, inquiry, and booking flows exist; their relationship to exploration can be clearer.
13. **Mobile behavior:** Shared navigation and a mobile booking bar exist in source. The loaded final local page did not resolve within the bounded mobile check, so overlap and final responsive rhythm remain implementation-verification requirements.
14. **Accessibility strengths:** Semantic navigation, breadcrumb, page heading, named controls, and existing dialog/gallery patterns provide a strong base.
15. **Accessibility weaknesses:** A cinematic redesign could regress focus order, overlay contrast, dialog behavior, and mobile action visibility if structure follows visuals instead of DOM order.
16. **Performance strengths:** Existing Next.js image, route, server-query, and component patterns can be reused; no new UI library is required.
17. **Performance risks:** Aggregate reads, fallback records, hero media, maps, reviews, and recommendations can create waterfalls or duplicate work.
18. **Applicable Venora principles:** Preserve current data truth, trust, actions, owner context, map, reviews, SEO, JSON-LD, and legacy fallbacks.
19. **Patterns inappropriate for Venora:** Replacing the shared marketplace shell, exposing draft structured content, inventing journey steps, or using unsupported match scores.
20. **Copying risks:** A redesign that imitates a single-property reference too closely would weaken marketplace consistency and cross-venue comparability.

### Current strengths

- Real save, share, inquiry, availability, and booking paths already exist.
- Packages, owner identity, map, reviews, recommendations, metadata, and JSON-LD are established.
- The Phase 2.3 structured aggregate provides a publication boundary and legacy fallback.
- Existing preview and media utilities reduce the need for parallel presentation logic.

### Current visual weaknesses

- The opening communicates listing facts before emotional possibility.
- The gallery mosaic resembles a standard marketplace pattern and does not establish a signature venue moment.
- Most sections use similar white-surface weight, producing a long factual stack rather than a paced editorial story.
- Published venue spaces are not yet the primary orientation and comparison model.
- Event Plan relevance is absent from the public decision journey.
- Packages and policies become prominent before the customer has fully pictured the event.

## 8. Comparison Matrix

Legend: `MVP` = required for deadline MVP, `Polish` = important polish, `Later` = later enhancement, `No` = not recommended.

### Opening and orientation

| Capability | Attached Venora mockup | Lazuri | Hillcreek | Biltmore | Current Venora | Recommended Phase 2.4 direction | Deferred to later phase | Not recommended | Reason |
|---|---|---|---|---|---|---|---|---|---|
| Cinematic hero | Core direction | Strong | Present | Strong and restrained | Listing title plus mosaic | MVP: full-bleed real venue media with clear identity | No | Exact reference composition | Establish emotion while preserving marketplace truth |
| Hero video | Optional enhancement | Heavy use | Limited | Not central | Promotional video exists | MVP when a published video exists; poster otherwise | Advanced streaming | Forced autoplay with sound | Progressive enhancement avoids blocking the page |
| Venue quick facts | Required | Immediate strip | Distributed | Concise facts | Present below gallery | MVP: capacity, setting, event types, pricing context | Expanded facts | Badge overload | Fast orientation without replacing detail |
| Section navigation | Compact and useful | Long-scroll navigation cues | Site-level branching | Minimal | None dedicated | Polish: sticky in-page anchors after hero | Scroll progress | Permanent oversized rail | Long page needs orientation without visual noise |
| Imagine your event here | Core emotional bridge | Implied | Implied by event pages | Implied by narrative | Absent | MVP: concise Event Plan-aware section | Rich scenarios | Fake generated story | Connects customer intent to real venue facts |
| Event Plan fit | Truthful explanations | None | None | None | Search mapping exists elsewhere | MVP: deterministic reasons only | Ranking/recommendations | Percentage or AI score | Explain fit without false precision |
| Property overview | Core | Visual journey | Destination model | Editorial intro | About plus map/facts | MVP: short editorial overview from published data | Deep destination modules | Invented estate map | Frames the property before details |

### Spaces, experiences, and media

| Capability | Attached Venora mockup | Lazuri | Hillcreek | Biltmore | Current Venora | Recommended Phase 2.4 direction | Deferred to later phase | Not recommended | Reason |
|---|---|---|---|---|---|---|---|---|---|
| Multiple venue spaces | Core explorer | Signature comparison | Named spaces | Venue comparison | Structured data exists | MVP: published spaces explorer | Cross-property compare | Flattened marketing-only cards | Spaces are the clearest property model |
| Capacity layouts | Structured facts | High-level capacity | Capacity per space | Capacity ranges | Structured data exists | MVP when published; label layout and range clearly | Visual seating diagrams | Inferred capacities | High-value planning data must remain factual |
| Event-type experiences | Conditional | Strong but celebration-led | Separate event pages | Wedding-specific | Basic types exist | MVP only from real space/event relationships | Curated showcases | Generic wedding copy for all | Venora serves many event categories |
| Venue journey | Desired | Strong emotional flow | Destination pathways | Real ceremony-to-reception narrative | Absent | MVP only with at least two published spaces and cautious wording | Timelines/showcases | Invented times or rooms | A truthful possible sequence helps visualization |
| Grouped gallery | Desired | Media-rich | Per-space carousels | Editorial images | One venue gallery | MVP grouped by venue and published space | Event galleries | Duplicate ungrouped image walls | Grouping adds context and reduces scanning cost |
| Fullscreen gallery | Desired | Sliders/tours | Carousels/360 | Simple media | Gallery viewer exists | MVP: reuse accessible viewer with captions | Hotspots and 360 | New carousel dependency | Existing behavior can be improved safely |
| Hero/video media controls | Required | Motion-heavy | Mixed | Restrained | Video component exists | MVP: pause, mute state, poster, keyboard access | Advanced playback analytics | Sound-on autoplay | Media must remain optional and controllable |
| Accommodation | Future destination value | Present through property offer | Detailed inventory | Present elsewhere in estate | Not structured for this profile | Later | Full accommodation module | Free-text pseudo inventory | Requires dedicated data and booking semantics |
| Dining | Future destination value | Package-related | Dedicated dining page | Estate service | Not structured for this profile | Later | Dining products | Invented inclusions | Current foundation cannot represent it safely |
| Event showcases | Valuable later | Real moments | Event pages | Gallery-led | Not first-class structured data | Later | Verified event case studies | Stock testimonial stories | Needs consent, moderation, and relationships |
| Floor plans | Later | Not central | Not central | Not central | Not supported | Later | Accessible plan viewer | Fake diagrams | Requires uploaded, described source files |
| Property map | Later | Visual estate context | Destination context | Estate map link | Real geographic map exists | Use MVP geographic map only | Structured property map | Invented illustrated map | Real coordinates are available; internal map data is not |
| 360 tours | Later | Tour-like rich media | Dedicated tour | Not central | Not supported | Later | 360 viewer | Required publication gate | Expensive and unavailable for most listings |

### Commerce, trust, and practical decisions

| Capability | Attached Venora mockup | Lazuri | Hillcreek | Biltmore | Current Venora | Recommended Phase 2.4 direction | Deferred to later phase | Not recommended | Reason |
|---|---|---|---|---|---|---|---|---|---|
| Packages | Experiences | Prominent all-in offers | Secondary to destination | Real assumptions and inclusions | Packages and compare exist | MVP: explain actual spaces/services, guest range, and price label | Custom builder | Inferred inclusions | Improve comprehension without changing commerce |
| Supplier context | Actual relationships only | Package inclusions | Destination services | Vendor ecosystem implied | Supplier marketplace separate | Show only real included services in MVP | Attached supplier partners | Suggested suppliers presented as included | Avoid misleading package claims |
| Logistics | Clear later-stage detail | Distributed | Strong local context | Concise facts | Strong current sections | MVP: grouped accordions/cards after packages | Rich transport planner | Long policy wall near hero | Keeps facts findable without flattening emotion |
| FAQs | Clear | Present late | Distributed | Dedicated support | Structured FAQs exist | MVP: published FAQs with accessible disclosure | Searchable FAQ | Empty accordion shell | Resolves objections close to decision stage |
| Reviews | Trust layer | Social proof | Brand-led | Editorial trust | Verified reviews exist | MVP: rating summary plus verified review list | Media reviews | Invented testimonials | Preserve existing marketplace trust |
| Trust signals | Restrained | Brand claims | Property credibility | Estate credibility | Verified owner and reviews | MVP: existing verification, owner, reviews, factual response data | Certifications module | Awards/booking counts without data | Claims must be auditable |
| Inquiry | Restrained sticky action | Ocular/contact heavy | Repeated inquiry | Restrained final inquiry | Existing inquiry flow | MVP: persistent but quiet desktop action after hero | Rich message context | External-message-first flow | Keeps customers inside Venora |
| Availability | Important | Viewing/contact based | Inquiry based | Inquiry based | Existing availability flow | MVP: request availability using existing path | Calendar intelligence | Promise of instant confirmation | Preserve current workflow semantics |
| Booking | Existing flow | Package/visit journey | Hotel/event inquiry | Inquiry | Existing booking flow | MVP: continue existing booking route | Package customization | Hero-sized booking form | Ready customers should proceed without obscuring exploration |
| Site visits | Mentioned only if real | Major ocular CTA | Inquiry may cover it | Contact-led | No dedicated workflow | Later | Scheduling workflow | Site-visit CTA now | Do not advertise an unsupported transaction |
| Mobile action bar | Required | Site-specific actions | Repeated buttons | Minimal | Existing component | MVP: compact safe-area bar with inquiry/booking priorities | Contextual personalization | Multi-row fixed panel | Keeps decisions reachable without covering content |
| Performance | Poster-first target | High media risk | Gallery/embed risk | Restrained | Existing Next/Image base | MVP budgets and progressive media | Adaptive streaming | Scroll hijacking/3D | Premium must still load on Philippine mobile networks |
| Accessibility | First-class | Motion/control risks | Semantic/control gaps | Relatively calm | Good semantic base | MVP WCAG-aligned structure and controls | Rich media transcripts | Visual-only interactions | Cinematic design cannot trade away access |
| SEO | Preserve marketplace truth | Single-brand SEO | Destination SEO | Strong editorial hierarchy | Metadata and JSON-LD exist | MVP: retain canonical metadata and truthful structured data | Space-level schema expansion | Duplicated or invented schema | Search signals must reflect published content |

## 9. Final Phase 2.4 Design Recommendation

### 9.1 Final section order

1. Shared Venora navigation and breadcrumb.
2. Cinematic hero with venue identity, location, factual positioning, save, share, explore, request availability, and inquiry/booking progression.
3. Compact venue quick facts.
4. Sticky in-page section navigation on sufficiently tall pages.
5. `Imagine your event here` with deterministic Event Plan fit or a neutral plan-building CTA.
6. Editorial property overview using real published description and media.
7. Published venue-space explorer.
8. Event-type experiences only when structured relationships support them.
9. `One possible way to experience the property` journey only when real published spaces support a sequence.
10. Grouped gallery and optional published venue video.
11. Packages presented through actual spaces, inclusions, guest ranges, and pricing labels.
12. Logistics, accessibility, restrictions, map, and practical policies.
13. Published FAQs.
14. Owner trust, verification, rating summary, and verified reviews.
15. Final availability, inquiry, or booking decision area.
16. Recommended venues and shared footer.

Empty sections are omitted. The section navigation must be derived from rendered sections so it never links to missing content.

### 9.2 Desktop layout strategy

- Use a full-width cinematic opening inside the shared marketplace shell.
- Keep hero content in a constrained readable column rather than a centered marketing block.
- Let selected media bands extend wider than text sections to create rhythm.
- Use alternating image-led and text-led compositions without turning every section into a card.
- Keep a compact inquiry surface sticky only after the hero and only where it does not overlap content.
- Make the space explorer the strongest interactive section, with a space index beside or above one focused detail panel.

### 9.3 Tablet layout strategy

- Reduce hero height and title scale without cropping identity or actions.
- Collapse asymmetric editorial compositions into balanced one- or two-column grids.
- Keep the section navigator horizontally scrollable with visible focus and no hidden required controls.
- Place inquiry controls in normal flow when sticky positioning would compete with content.

### 9.4 Mobile layout strategy

- Use a stable poster-led hero around 70-82 dynamic viewport height when media supports it.
- Stack identity, quick facts, and actions without placing a full booking form over imagery.
- Use one-column content; allow only purposeful horizontal scrolling for space or section selectors.
- Keep the mobile action bar to the minimum existing decisions, respect safe-area insets, and reserve page padding so it covers nothing.
- Ensure galleries, dialogs, accordions, maps, long names, prices, and owner information fit at 360 px.

### 9.5 Hero media behavior

- Photograph is the guaranteed default.
- Use only the published primary venue image or a truthful legacy fallback.
- Enhance with an uploaded, published venue video when present.
- Video begins muted, never plays audio automatically, has pause/mute controls, and yields to reduced-motion or data-saving preferences.
- Render the poster first and avoid delaying the venue name or primary action while video initializes.
- Use a restrained overlay whose opacity follows measured text contrast, not a decorative gradient style.

### 9.6 Typography hierarchy

- Reuse Venora's application font and tokens; do not import reference fonts.
- One `h1` contains the venue name.
- Use one editorial display scale in the hero, consistent section headings, compact metadata, and readable `text-base` body copy.
- Keep long-form text within approximately 65-75 characters per line.
- Avoid `font-black`, excessive uppercase, negative letter spacing, and viewport-scaled type.

### 9.7 Image-treatment rules

- Use real published venue media only.
- Preserve stable aspect ratios and focal crops across breakpoints.
- Associate space media with the correct space and expose captions/alt text.
- Avoid repeating one image across hero, gallery, space cards, and recommendations when alternatives exist.
- Do not use stock, reference-site, generated, or unrelated imagery as a venue fallback.

### 9.8 Spacing rhythm

- Use the existing 8 px spacing system.
- Give emotional media transitions more breathing room than metadata blocks.
- Keep quick facts, labels, and practical controls compact.
- Prefer unframed content bands and dividers over wrapping every section in a floating card.

### 9.9 Color and overlay rules

- Venora blue remains the primary action color.
- Use warm venue photography, cool off-white/neutral surfaces, and dark readable text.
- Green is reserved for verified or positive trust signals; amber is reserved for ratings or warnings.
- Do not borrow reference palettes, use purple gradients, or add decorative glows.

### 9.10 Interaction rules

- Save and share remain lightweight exploratory actions.
- Section anchors move focus predictably and account for sticky navigation.
- Gallery, space selector, package action, inquiry, and booking controls retain clear accessible names.
- No required information may exist only on hover.
- Existing route and server-action contracts remain authoritative.

### 9.11 Animation rules

- Use subtle opacity and short transform reveals only where they reinforce hierarchy.
- Do not use scroll hijacking, 3D scene changes, cursor effects, or parallax required to understand content.
- Keep animation timing consistent with Venora and avoid reproducing reference timings.
- Content must remain visible and usable before animation JavaScript runs.

### 9.12 Reduced-motion behavior

- Disable reveal translation, parallax, and nonessential autoplay when `prefers-reduced-motion: reduce` is active.
- Show the hero poster instead of motion-dependent video behavior.
- Preserve all information and controls in the static experience.

### 9.13 Space-explorer behavior

- Render only published spaces returned by the structured aggregate.
- Provide a keyboard-operable space list with the active space identified in text and state.
- Show real name, setting, capacity range, capacity by layout, media, description, amenities, event types, accessibility, restrictions, operating notes, and related packages when present.
- On mobile, stack the selected space detail below a compact selector; do not force a miniature desktop rail.
- Legacy venues without structured spaces fall back to the existing venue overview rather than an empty explorer.

### 9.14 Event-type behavior

- Show an event-type experience only when an actual published relationship or supported venue event type exists.
- Use the same flexible component for weddings, birthdays, debuts, corporate events, conferences, seminars, graduations, reunions, product launches, intimate celebrations, and other real types.
- Never make the page wedding-only or infer a use case from photography.

### 9.15 Venue-journey behavior

- Render only when at least two published spaces can support a truthful spatial sequence.
- Introduce it as `One possible way to experience the property.`
- Describe movement between actual spaces without times, promises, or invented preparation/dining/afterparty locations.
- Omit the journey when the data cannot support it.

### 9.16 Event Plan fit behavior

- Read the signed-in customer's existing Event Plan through established query and mapping logic.
- Explain only deterministic matches such as guest range, preferred area, setting, event type, requested amenities, parking, or accessibility.
- Do not expose the plan to other users or server-render private details into shared cache output.
- For anonymous customers or customers without a plan, present a neutral `Build Event Plan` action.
- Do not display percentages, scores, AI labels, or unsupported recommendations.

### 9.17 Package presentation

- Preserve the existing package source and transaction paths.
- Present real package name, related spaces, actual included services, real guest range, pricing label, and optional items.
- Use an inquiry or booking action appropriate to the package's current behavior.
- Hide absent facts instead of inferring them.
- Retain comparison as a secondary tool, not the first emotional interaction.

### 9.18 Logistics presentation

- Group location, directions, parking, transit, accessibility, weather backup, curfew, noise, setup/teardown, supplier rules, pets, smoking, and policies by customer question.
- Display only fields returned by the published aggregate or existing legacy source.
- Keep the real map; do not fabricate an internal property map.
- Use compact summaries with accessible expansion for longer details.

### 9.19 FAQ presentation

- Render published FAQs after logistics and before final trust/decision content.
- Use native or accessible disclosure semantics, preserve keyboard operation, and avoid nested interactive controls.
- Omit the section when no published FAQs exist.

### 9.20 Review presentation

- Preserve verified Venora review data and current aggregation.
- Lead with average rating and count, then show category summaries and recent reviews when real.
- Use a compact `No reviews yet` state rather than a large empty panel.
- Do not import testimonials from owner marketing copy.

### 9.21 Desktop inquiry behavior

- Keep inquiry/request-availability visible after initial exploration through a restrained sticky surface or section-level action.
- Do not cover hero media or compete with the venue name.
- Stop sticky behavior before the footer and ensure it never overlaps reviews, recommendations, or dialogs.

### 9.22 Mobile action-bar behavior

- Reuse the existing mobile booking/action pattern.
- Show no more than the current highest-value actions.
- Respect safe-area insets, maintain at least 44 px touch targets, and reserve bottom content padding.
- Hide or move the bar when dialogs, keyboards, or fullscreen gallery controls require the same space.

### 9.23 Legacy venue fallback

- If no published structured aggregate exists, retain the current venue data, gallery, packages, policies, map, reviews, owner, and booking/inquiry flows.
- Do not show empty space, journey, event-type, logistics, or FAQ shells.
- Keep metadata and JSON-LD truthful to the legacy source.

### 9.24 Empty-section behavior

- Omit optional sections that have no published content.
- Use compact empty states only where absence itself is decision-relevant, such as reviews.
- Never use placeholder cards, invented claims, or draft preview content on the public route.

### 9.25 Performance safeguards

- Prioritize one hero poster only; lazy-load below-fold media.
- Supply responsive `sizes`, stable dimensions, and efficient formats through existing image handling.
- Use `preload="none"` or metadata-only video behavior until enhancement is appropriate.
- Lazy-load the map and heavy dialogs when practical.
- Avoid new animation, carousel, video, or 360 libraries.
- Minimize client boundaries and reuse the server-fetched aggregate rather than refetching sections independently.
- Test on a mid-range mobile profile and slow network, not only local desktop.

### 9.26 Accessibility safeguards

- Preserve one logical heading tree and a usable reading order independent of visual composition.
- Maintain WCAG AA contrast over every hero frame and fallback poster.
- Provide descriptive image alt text, captions where needed, and video controls/transcripts when speech conveys information.
- Ensure section navigation, space selection, gallery, package comparison, accordions, and dialogs are keyboard-operable with visible focus.
- Announce active space state and dialog changes without relying on color.
- Respect reduced motion, zoom to 200%, text reflow, 44 px touch targets, and safe-area placement.

### 9.27 SEO safeguards

- Preserve the existing canonical route, metadata generation, Open Graph data, and JSON-LD.
- Build descriptions from public published content only.
- Do not duplicate hidden sections for SEO or include draft structured records.
- Update structured data only where the existing schema can truthfully represent spaces, offers, ratings, and location.
- Keep one `h1` and server-render meaningful venue identity and overview content.

## 10. Implementation Priorities

### Required for deadline MVP

- Cinematic photo-first hero with optional published muted video.
- Venue identity, quick facts, save, share, inquiry, availability, and existing booking action.
- Deterministic Event Plan fit with a safe no-plan fallback.
- Published structured venue-space explorer and legacy fallback.
- Conditional event-type experience and truthful venue journey.
- Grouped gallery and accessible fullscreen viewer.
- Packages using actual spaces, services, guest ranges, and prices.
- Logistics, real map, accessibility, restrictions, policies, and FAQs.
- Owner trust and verified reviews.
- Desktop, tablet, and mobile responsiveness.
- Accessibility, performance, metadata, and JSON-LD protection.

### Important polish

- Compact sticky section navigation.
- Editorial section transitions using layout rather than decorative effects.
- Subtle nonessential reveal motion with reduced-motion behavior.
- Improved image focal crops and duplication avoidance.
- Restrained desktop sticky inquiry surface.

### Later enhancement

- Accommodation inventory.
- Dining products.
- Event showcases.
- Floor plans.
- Internal property maps.
- 360 tours and hotspots.
- Advanced recommendation ranking.
- Advanced package customization.
- Site-visit scheduling.
- Adaptive video streaming and richer media analytics.

### Not recommended

- Numeric Event Plan match percentages or fake AI scores.
- Hero-covering booking forms.
- Scroll hijacking, 3D effects, or animation required for comprehension.
- Wedding-only information architecture.
- Invented event times, rooms, package inclusions, awards, booking counts, or supplier relationships.
- Copied reference assets, wording, type, layouts, colors, or animation timings.

## 11. Deferred Features

Accommodation, dining, showcases, floor plans, property maps, 360 tours, hotspots, advanced recommendation ranking, package customization, and site-visit scheduling remain outside Phase 2.4. They require dedicated structured records, moderation/publication rules, accessible viewers, and transaction behavior that the immediate public profile should not simulate with free text.

## 12. Patterns Rejected

- Lazuri's high-density motion, repeated video/tour modules, and ocular-first funnel.
- Hillcreek's hotel booking widget, destination-specific content breadth on one profile, and repeated inquiry controls.
- Biltmore's wedding-only taxonomy, estate-specific claims, and exact editorial styling.
- A custom page shell that replaces Venora navigation or weakens marketplace comparison.
- Any fallback that uses unrelated imagery or exposes draft structured content.
- Decorative cards, badges, gradients, and icons that do not improve decisions.

## 13. Accessibility Requirements

- One `h1`, logical headings, landmarks, breadcrumb, and skip navigation.
- Keyboard and screen-reader support for section navigation, space explorer, gallery, video, package comparison, FAQ, and dialogs.
- Visible focus, 44 px targets, AA contrast, meaningful alt text, captions, and non-color status labels.
- Static equivalent for motion, `prefers-reduced-motion` compliance, and no autoplay audio.
- 200% zoom, 360 px reflow, long-name wrapping, and no horizontal page overflow.
- Mobile fixed actions must never cover focused controls, content, or safe-area regions.

## 14. Performance Requirements

- One prioritized hero poster; all other media lazy-loaded with stable dimensions.
- Optional video must not block identity, layout, or primary actions.
- Reuse the structured aggregate and existing media/component utilities; avoid section-level duplicate queries.
- Defer map and heavy overlays until near interaction.
- Avoid new packages and main-thread-heavy animation.
- Validate LCP, CLS, INP, image transfer, and client bundle cost on representative mobile hardware and a constrained network.

## 15. Mobile Requirements

- Verify at 390 px and 360 px, plus tablet portrait and landscape.
- Use a poster-first hero, readable title, wrapped metadata, stacked actions, and compact quick facts.
- Keep only purposeful horizontal scroll areas and expose their controls to keyboard/touch users.
- Place the selected space detail in normal document flow.
- Reserve bottom space for the action bar and avoid footer, dialog, keyboard, or chat overlap.
- Ensure gallery close controls, video controls, package decisions, and inquiry controls stay reachable in both orientations.

## 16. Implementation Risks

1. **Dual data paths:** Structured and legacy venue records can diverge. Keep one explicit aggregate/fallback boundary.
2. **Draft leakage:** Public components must consume published structured content only.
3. **Event Plan privacy:** Personal fit explanations must not enter shared cache output or leak between users.
4. **Media cost:** Hero video, grouped galleries, map, reviews, and recommendations can create a slow waterfall.
5. **Visual overreach:** Copying single-property references would reduce Venora's marketplace consistency.
6. **Invented journeys:** Sparse space data can tempt the UI to manufacture a story; omit unsupported sections.
7. **Sticky collisions:** Desktop inquiry, mobile action bar, assistant controls, dialogs, and footer can overlap.
8. **SEO regression:** Client-only identity or duplicated hidden content could weaken current metadata and structured data.
9. **Accessibility regression:** Visual reordering, motion, overlays, and custom selectors can break a currently sound semantic base.
10. **Mobile verification gap:** The local mobile route remained in a loading state during this reference check; loaded responsive behavior needs fresh verification during implementation.

## 17. Final Section Order

The approved implementation sequence is:

1. Shared navigation and breadcrumb
2. Cinematic hero
3. Venue quick facts
4. In-page section navigation
5. Imagine your event here / Event Plan fit
6. Property overview
7. Venue-space explorer
8. Conditional event-type experiences
9. Conditional venue journey
10. Grouped gallery and optional video
11. Packages as experiences
12. Logistics, map, and practical policies
13. FAQs
14. Owner trust and verified reviews
15. Final inquiry, availability, or booking decision
16. Recommended venues
17. Shared footer

## 18. Final Design Checklist

### Content and truth

- [ ] Every public value comes from published structured data or the explicit legacy fallback.
- [ ] No event type, capacity, space, journey, package inclusion, or trust claim is inferred.
- [ ] Event Plan explanations are deterministic, private, and score-free.
- [ ] Empty optional sections are omitted.

### Visual design

- [ ] Hero uses real venue media and remains readable before video loads.
- [ ] Emotional story precedes packages and policy detail.
- [ ] Space explorer is the strongest interactive content section.
- [ ] Venora tokens, typography, navigation, actions, and footer remain recognizable.
- [ ] Desktop, tablet, and mobile compositions are deliberately different where needed.

### Interaction

- [ ] Save, share, inquiry, availability, and booking retain existing behavior.
- [ ] Section navigation contains only rendered destinations.
- [ ] Space, gallery, package, FAQ, and dialog controls are keyboard-operable.
- [ ] Sticky controls never cover content, footer, chat/help controls, or dialogs.

### Accessibility

- [ ] One `h1` and logical heading order.
- [ ] AA contrast across hero media states.
- [ ] Alt text, captions, focus, status labels, and 44 px targets are verified.
- [ ] Reduced-motion and static media behavior are verified.
- [ ] 200% zoom and 360 px reflow have no horizontal page overflow.

### Performance and SEO

- [ ] Only the hero poster is prioritized.
- [ ] Below-fold media and map are deferred.
- [ ] Optional video does not block LCP or layout.
- [ ] No new animation or media dependency is added.
- [ ] Existing metadata, canonical URL, Open Graph data, and JSON-LD remain truthful.
- [ ] Structured and legacy routes receive browser verification.

## 19. Readiness Decision

The research is sufficiently complete to begin Phase 2.4 implementation. The design direction is coherent, the current data boundary can support the deadline MVP, and unsupported destination modules are explicitly deferred. Implementation must preserve the documented evidence limitations: the missing discrete mockup asset prevents pixel-level visual comparison, and the final loaded mobile route still requires fresh browser verification.

Classification: **Complete with inaccessible-page limitations**.
