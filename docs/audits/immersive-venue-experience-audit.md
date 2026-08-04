# Immersive Venue Experience Audit

Phase: 2.1 Immersive Venue Experience Audit
Repository: C:\venora
Audit date: 2026-07-31
Scope: documentation and planning only

## 1. Executive Summary

Venora already has a solid marketplace venue detail page: published venue lookup, SEO metadata, JSON-LD, image gallery, promotional video, map, reviews, packages, availability-aware booking, inquiry CTA, favorites, share action, owner profile link, and Event Plan search handoff.

The page is not yet an immersive venue experience. The current model treats a venue mostly as one listing with media, amenities, packages, policy text, and availability. It does not yet support first-class event spaces, capacity by layout, room/accommodation products, dining options, event showcases, floor plans, grouped galleries, 360 tours, site visits, structured logistics, or venue-specific FAQ content.

The next phase should start with structured domain foundation, not UI polish. Most immersive capabilities require schema, RLS, owner authoring, moderation, and media infrastructure before a public redesign can be honest.

## 2. Current Venora Venue Journey

Current customer path:

1. Customer discovers venues from `/venues`.
2. Customer opens `/venues/[slug]`.
3. The page loads a published database venue or a research fallback venue.
4. Customer reviews hero, gallery, facts, about text, map, amenities, packages, policies, owner profile, reviews, related venues, and booking/sidebar actions.
5. Customer can save/favorite, share, inquire, select date/package/guest count, or continue to `/venues/[slug]/book`.
6. If the user has an Event Plan, supported answers can prefill venue-search filters before discovery.

Evidence:

- `apps/web/app/(customer)/venues/[slug]/page.tsx`
- `apps/web/src/features/venues/ui/VenueDetails.tsx`
- `apps/web/src/features/venues/ui/BookingSidebar.tsx`
- `apps/web/src/features/event-planning/utils/event-plan-search-mapper.ts`

## 3. Public Venue-Page Architecture

Primary route:

- `/venues/[slug]`
- File: `apps/web/app/(customer)/venues/[slug]/page.tsx`

Main public components:

- `apps/web/src/features/venues/ui/VenueDetails.tsx`
- `apps/web/src/features/venues/ui/VenueGallery.tsx`
- `apps/web/src/features/venues/ui/VenueFeaturedGallery.tsx`
- `apps/web/src/features/venues/ui/VenuePromotionalVideo.tsx`
- `apps/web/src/features/venues/ui/BookingSidebar.tsx`
- `apps/web/src/features/venues/ui/PackageComparePicker.tsx`
- `apps/web/src/features/venues/ui/ReviewsSection.tsx`
- `apps/web/src/features/venues/ui/RecommendedVenues.tsx`
- `apps/web/src/features/venues/ui/InquiryDialog.tsx`

Data and metadata:

- `page.tsx` selects `venues`, `venue_packages`, `venue_images`, `venue_amenities`, and `organizations`.
- `generateMetadata` builds title, description, canonical URL, Open Graph, and Twitter metadata.
- `buildVenueJsonLd` outputs EventVenue structured data when enough fields exist.
- `getPublicOwnerProfileByVenue` provides owner profile data for the Managed By card.
- `getPublishedVenueReviewsRaw` and `reviews` provide customer review data.
- `getNearbyResearchVenueDetails` and `getFallbackResearchVenueRecommendations` support nearby/recommended content.

Implemented public actions:

- Favorite/save through `favorites`.
- Share through browser share/copy behavior in `VenueDetails`.
- Inquiry through `InquiryDialog`.
- Booking through `BookingSidebar` and `/venues/[slug]/book`.
- Owner profile link through `/owners/[slug]?from=venue&venueSlug=[venueSlug]`.

## 4. Venue-Owner Editor Architecture

Main owner venue routes:

- `apps/web/app/(venue-owner)/dashboard/venues/new/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/venues/[id]/edit/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/calendar/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/packages/new/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/packages/[id]/edit/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/business-profile/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/business-profile/preview/page.tsx`

Current editing style:

- Venue editing is section-based in one long form.
- Package editing is a multi-step builder.
- Availability is managed through a calendar page.
- Business profile editing has draft/publication concepts, but venue profile editing does not have a comparable venue-profile publication workflow.

Owner can manage:

- Venue name, description, location, coordinates, capacity, base price, price unit, setting.
- Amenity selections and custom amenities.
- Policy text, rules, and boolean feature flags.
- Packages and package suppliers through the package builder.
- Images and one promotional video.
- Availability dates through the calendar.
- Business profile identity, contact, logo, cover image, public profile preview, and publication.

Owner cannot currently manage as structured public venue content:

- First-class event spaces.
- Capacity by seating layout.
- Space-specific galleries, restrictions, amenities, or packages.
- Accommodation room types.
- Dining options.
- Event showcases.
- Venue FAQs.
- Site-visit scheduling.
- Floor plans and 360 tour embeds.
- Structured operating hours on the public page, despite `venues.operating_hours` existing.

## 5. Database and Domain Model

Existing reusable tables and concepts:

- `venues`
- `venue_images`
- `venue_amenities`
- `amenities`
- `venue_packages`
- `venue_category_assignments`
- `venue_event_types`
- `venue_availability`
- `inquiries`
- `bookings`
- `favorites`
- `reviews`
- `supplier_profiles`
- `supplier_services`
- `venue_suppliers`
- `venue_supplier_agreements`
- `package_suppliers`
- `business_profiles`
- `business_profile_publications`
- `business_profile_venues`
- `business_portfolio_items`
- `business_team_members`
- `business_social_links`
- `business_profile_policies`
- `event_plans`

Evidence:

- `supabase/migrations/0040_venues.sql`
- `supabase/migrations/0045_venues_core.sql`
- `supabase/migrations/005_bookings.sql`
- `supabase/migrations/006_suppliers.sql`
- `supabase/migrations/007_reviews.sql`
- `supabase/migrations/0795_business_profiles.sql`
- `supabase/migrations/20260723300000_supplier_agreements.sql`
- `supabase/migrations/20260724000001_venue_package_enhancements.sql`
- `supabase/migrations/20260730075945_create_event_plans.sql`

Schema support classification:

| Capability | Status | Evidence |
| --- | --- | --- |
| One venue listing | Implemented | `venues` table and `/venues/[slug]`. |
| Venue gallery | Implemented | `venue_images` and `VenueGallery`. |
| One promotional video | Partially implemented | `VenueVideoUpload` and `VenuePromotionalVideo`. |
| Venue amenities | Implemented | `venue_amenities`, `amenities`, custom amenities. |
| Venue packages | Implemented | `venue_packages`, package builder. |
| Supplier participation in packages | Partially implemented | `package_suppliers` exists, public venue page does not surface supplier details. |
| Availability and booking dates | Implemented | `venue_availability`, calendar actions, booking sidebar checks. |
| Reviews | Implemented | `reviews`, review trigger, `ReviewsSection`. |
| Owner profile | Implemented | public owner RPCs and `/owners/[slug]`. |
| Multiple event spaces | Blocked by data model | No first-class space table found. |
| Capacity by layout | Blocked by data model | No capacity layout entity found. |
| Space-specific galleries | Blocked by data model | `venue_images` only references `venue_id`. |
| Accommodation types | Blocked by data model | No accommodation/room type table found. |
| Dining options | Blocked by data model | No venue dining entity found. |
| Event showcases | Blocked by data model | No venue event showcase entity found. |
| 360 tour embeds | Blocked by media infrastructure | No virtual tour entity or embed allowlist found. |
| Floor plans | Blocked by media infrastructure | Storage bucket only allows image/video MIME types for venue media. |
| Venue FAQs | Blocked by data model | No venue FAQ table found. |
| Site-visit scheduling | Blocked by data model | No site visit entity found. |
| Structured logistics | Partially implemented | Booleans and text fields exist, but no structured logistics model. |
| Venue publication versioning | Blocked by owner tooling | Business profiles have publication snapshots; venues do not. |

## 6. Media and Storage Infrastructure

Current storage:

- `venue-images` bucket, public, 50MB file limit.
- Allowed MIME types include JPEG, PNG, WebP, GIF, MP4, and QuickTime.
- `business-profiles` bucket, public, image-focused, 50MB file limit.

Evidence:

- `supabase/migrations/012_storage.sql`
- `supabase/migrations/20260728161000_qualify_venue_media_object_path.sql`
- `supabase/migrations/0795_business_profiles.sql`

Upload utilities:

- `apps/web/src/components/venues/VenuePhotoUpload.tsx`
- `apps/web/src/components/venues/VenueVideoUpload.tsx`
- `apps/web/src/features/venues/utils/venue-media.ts`
- `apps/web/src/features/business-profiles/ui/BusinessProfileEditor.tsx`

Implemented:

- Public image URLs.
- Client-side image compression to Web-friendly JPEG.
- Image ordering.
- Featured image selection.
- Image deletion.
- Promotional video upload, replacement, and deletion.
- Path-scoped venue media ownership hardening.

Partially implemented:

- `venue_images.alt_text` exists, but owner-facing alt text editing was not found in the inspected upload UI.
- Video upload is supported, but no evidence of transcoding, adaptive streaming, poster generation, or advanced optimization was found.

Missing or blocked:

- Multiple gallery collections.
- Media captions.
- Space-specific media.
- 360 virtual-tour embeds.
- Floor-plan uploads and PDF previews.
- External video links with allowlist validation.
- Event-gallery consent workflow.
- Content moderation workflow.
- Explicit orphan cleanup audit beyond delete actions.

## 7. Spaces

Status: Blocked by data model.

Current Venora supports venue-level capacity and indoor/outdoor setting, but does not model child spaces such as ballroom, garden, pavilion, ceremony area, reception area, preparation suite, meeting room, or dining room.

Missing per-space data:

- Name, type, description.
- Capacity and capacity by layout.
- Dimensions.
- Indoor/outdoor classification.
- Amenities and accessibility.
- Restrictions.
- Event types.
- Gallery, video, virtual tour, and floor plan.
- Package relationships.

Evidence:

- `venues` contains venue-level fields.
- `venue_images` references `venue_id`, not a child space.
- No first-class space table was found in migrations or venue feature code.

## 8. Accommodations

Status: Blocked by data model.

No accommodation or room-type entity was found for venue-level room inventory, bed configuration, room size, check-in/check-out, guest capacity, room galleries, event package inclusion, or preparation-room use.

Existing related data:

- `venues.overnight_accommodation` boolean.
- `business_profile_venues` can associate public owner profile with venues, but does not define room products.

## 9. Dining

Status: Blocked by data model.

No dining, restaurant, menu, bar service, dietary support, breakfast, afterparty, or external-caterer policy model was found.

Existing related data:

- `venue_packages.inclusions` can contain text.
- `venue_rules` and `cancellation_policy` can mention dining rules, but that is unstructured.
- Supplier relationships may include catering suppliers, but the public venue page does not present dining as venue-owned structured content.

## 10. Packages

Status: Partially implemented.

Implemented:

- Package builder with venue, name, description, event type, guest count range, price, price unit, deposit terms, active state, amenities, venue rules, inclusions, and suppliers.
- Public venue page lists active venue packages and can compare packages.
- Booking sidebar can carry selected package into booking flow.

Gaps:

- Packages are not tied to venue spaces.
- Customer-facing total price semantics are not normalized.
- Optional additions and customization are limited.
- Supplier participation exists in `package_suppliers` but is not a strong public venue-section experience.

Evidence:

- `apps/web/app/(venue-owner)/dashboard/packages/new/_components/PackageBuilderForm.tsx`
- `apps/web/src/features/venues/application/package-actions.ts`
- `apps/web/src/features/venues/application/package-queries.ts`
- `apps/web/src/features/venues/ui/PackageComparePicker.tsx`

## 11. Suppliers

Status: Partially implemented.

Implemented:

- Supplier profiles and supplier services exist.
- Venue supplier associations and supplier agreements exist.
- Package suppliers can be attached in the package builder.

Gaps:

- The public venue page does not yet show accredited suppliers as a trust and package context section.
- Supplier policies for customer-supplied vendors are not structured.
- There is technical debt around earlier migration references to `public.suppliers` while newer code uses `supplier_profiles`.

Evidence:

- `supabase/migrations/006_suppliers.sql`
- `supabase/migrations/20260723300000_supplier_agreements.sql`
- `supabase/migrations/20260724000001_venue_package_enhancements.sql`
- `apps/web/src/features/venues/application/package-queries.ts`

## 12. Event Showcases

Status: Blocked by data model and moderation workflow.

No entity was found for real event stories, spaces used, guest count, suppliers involved, style/theme, gallery, testimonial, publication consent, or featured status.

Future event showcases should require:

- Owner authorization.
- Customer/media consent.
- Moderation state.
- Published/unpublished state.
- Links to venue, spaces, suppliers, and reviews when supported.

## 13. Virtual Media

Status: Partially implemented for video; blocked for 360 tours and floor plans.

Implemented:

- One promotional video can be uploaded and displayed.
- Gallery lightbox supports images and video media records.

Missing:

- 360 tour entity.
- External embed URL validation and provider allowlist.
- Accessible fallback for virtual tour.
- Floor-plan file support.
- Interactive map/hotspot model.
- Media grouping by section or space.

## 14. Logistics

Status: Partially implemented.

Current public page exposes some logistics through:

- Venue address and map.
- Parking availability.
- Wheelchair accessibility.
- Indoor/outdoor setting.
- Rules text.
- Cancellation policy.
- Amenity list.

Missing structured logistics:

- Directions and travel time.
- Nearby landmarks, churches, accommodations, and transport.
- Weather backup.
- Curfew and noise restrictions.
- Setup/teardown rules.
- Pet policy beyond one venue-level boolean.
- Site-visit scheduling.
- Structured operating hours on the public page.

## 15. Trust and Reviews

Status: Implemented with future enhancement opportunities.

Implemented:

- Verified customer reviews are tied to completed bookings.
- Venue aggregate rating and review count are maintained by trigger.
- Public venue page renders review summary and review list.
- Owner profile link provides business trust context.

Evidence:

- `supabase/migrations/007_reviews.sql`
- `apps/web/src/features/venues/ui/ReviewsSection.tsx`
- `apps/web/src/features/owners/application/queries.ts`

Gaps:

- Imported testimonials are not modeled.
- Awards and certifications are not modeled.
- Response time is not modeled.
- Venue FAQs are not modeled.
- Owner responses exist in review schema but should be checked for complete public workflow before productizing deeper trust modules.

## 16. Event Plan Integration

Status: Partially implemented.

Implemented:

- Anonymous and authenticated Event Plan wizard exists.
- Saved Event Plan can map supported answers into venue search parameters.
- The mapping is deterministic, not AI.

Current safe comparisons:

- Event type.
- Province and city.
- Guest count against venue capacity.
- Venue style/category subset.
- Indoor/outdoor preference.
- Amenity requirements for mapped amenities.
- Sort preference.

Comparisons that need better venue data:

- Accommodation requirement.
- Backup indoor-space requirement.
- Services needed.
- Package preference.
- Accredited supplier preference.
- Event flow and space suitability.

Unsafe comparison:

- Total event budget, because current venue/package pricing semantics do not consistently represent total customer cost.

Evidence:

- `apps/web/src/features/event-planning/domain/event-plan.types.ts`
- `apps/web/src/features/event-planning/domain/event-plan.constants.ts`
- `apps/web/src/features/event-planning/utils/event-plan-search-mapper.ts`
- `apps/web/src/features/event-planning/components/EventPlanningWizard.tsx`

## 17. Accessibility

Status: Partially implemented.

Existing positive signals:

- Standard buttons and links are used.
- Image components include alt text fallbacks.
- Booking date availability is communicated with text messages in addition to color.
- Review and booking actions are mostly explicit.

Risks for future immersive work:

- Heavy image/video experiences can make keyboard and screen-reader paths weaker.
- 360 tours need accessible fallback text and keyboard-safe controls.
- Gallery captions and alt text must be owner-editable or moderation-assisted.
- Motion should respect reduced-motion preferences.

## 18. Mobile Responsiveness

Status: Partially implemented.

Existing public venue page uses responsive layout patterns, with desktop sidebar and mobile stacking. Future immersive modules must be designed mobile-first because space explorers, galleries, maps, package comparisons, and videos can easily create horizontal overflow or excessive scroll depth.

## 19. Performance

Status: Partially implemented.

Strengths:

- Next image usage appears in key venue components.
- Venue photo upload compresses images client-side.
- Public venue route fetches only the current venue and supporting records.

Risks:

- Public venue pages can become media-heavy.
- Video uploads are not transcoded into adaptive formats.
- Future galleries, 360 tours, and maps can harm LCP and mobile performance.
- Static research fallback media and DB media need consistent optimization rules.

## 20. Security and Privacy

Status: Partially implemented with important boundaries already present.

Strengths:

- Venue media bucket policies were hardened to path-scope writes by organization and venue.
- Public owner profile data is exposed through RPCs instead of raw private profile fields.
- Reviews require completed bookings.
- Availability changes are owner/coordinator guarded.

Risks:

- External embeds for video or 360 tours would require provider allowlists and URL sanitization.
- Real event stories require explicit media/customer consent.
- Floor-plan uploads need file type validation and malware considerations.
- Supplier relationship claims must come from active agreements.
- Pricing, availability, and capacity claims must avoid misleading customers.

## 21. Gap Matrix

| Area | Classification | Primary blocker | Evidence |
| --- | --- | --- | --- |
| Venue identity | Implemented | None | `VenueDetails`, `venues`. |
| Hero gallery | Implemented | None | `VenueGallery`, `venue_images`. |
| Promotional video | Partially implemented | Media optimization | `VenueVideoUpload`, `VenuePromotionalVideo`. |
| Availability CTA | Implemented | None | `BookingSidebar`, `venue_availability`. |
| Inquiry CTA | Implemented | None | `InquiryDialog`. |
| Site-visit CTA | Missing | Data model and workflow | No site-visit route/entity found. |
| Event types | Partially implemented | Owner tooling | `venue_event_types` exists; venue editor did not expose event-type assignment. |
| Venue types/categories | Partially implemented | Owner tooling | `venue_category_assignments` exists; editor did not expose category assignment. |
| Operating hours | Partially implemented | Owner tooling/public UI | `venues.operating_hours` exists; not surfaced in inspected venue page/editor. |
| Individual spaces | Blocked by data model | Schema | No venue-space table found. |
| Accommodations | Blocked by data model | Schema | Only venue boolean exists. |
| Dining | Blocked by data model | Schema | No dining entity found. |
| Package spaces | Blocked by data model | Schema | `venue_packages` has no space relationship. |
| Package suppliers | Partially implemented | Public UI | `package_suppliers`. |
| Event showcases | Blocked by data model | Schema/moderation | No showcase entity found. |
| 360 tours | Blocked by media infrastructure | Embed model | No virtual-tour entity found. |
| Floor plans | Blocked by media infrastructure | Storage/model | Venue bucket allows images/videos only. |
| FAQs | Blocked by data model | Schema/editor | No venue FAQ entity found. |
| Reviews | Implemented | None | `reviews`, `ReviewsSection`. |
| Owner trust | Implemented | None | `/owners/[slug]`, owner RPCs. |
| Event Plan fit | Partially implemented | Venue data quality | Search mapper exists; venue page fit module absent. |

## 22. Reusable Existing Assets

- Public venue route and SEO foundation.
- Venue gallery and featured-gallery components.
- Promotional video upload and display.
- Booking sidebar with availability validation.
- Calendar availability domain and actions.
- Reviews and completed-booking review guard.
- Package builder and package query/actions.
- Supplier agreement/package supplier model.
- Business profile publication model and public owner RPCs.
- Event Plan domain, local persistence, and venue search mapper.
- Storage path-owner policy pattern.

## 23. Blockers

Phase 2.2 should not start with public UI implementation until these are designed:

- Space model and ownership/RLS.
- Media collection model and grouping rules.
- Venue publication workflow.
- Package-to-space relationship.
- Structured logistics and FAQ model.
- Owner authoring and preview behavior.
- Consent/moderation approach for real event showcases.
- External embed security policy.

## 24. Technical Debt

- Supplier domain has historical migration drift: older migration references `public.suppliers`, while current supplier code and later migrations use `supplier_profiles`.
- Venue and business-profile data can overlap conceptually, so public owner trust and public venue content must keep clear boundaries.
- Some schema fields exist without inspected owner/public UI support, such as `venues.operating_hours`.
- Static research venues still supplement DB venues, which can hide missing production data during UX review.
- Media alt text exists at schema level but was not found as a complete owner-editable field in the inspected photo upload UI.

## 25. Recommended Priorities

1. Design structured venue foundation around spaces, logistics, FAQs, media collections, and venue publication state.
2. Add owner authoring and preview before public UI expansion.
3. Add public immersive venue page using real structured data.
4. Add Event Plan fit explanations after the public page has reliable data.
5. Add event showcases, accommodations, dining, 360 tours, and advanced package/supplier context in later phases.

## 26. Evidence Appendix

Routes and pages:

- `apps/web/app/(customer)/venues/[slug]/page.tsx`
- `apps/web/app/(customer)/venues/[slug]/book/page.tsx`
- `apps/web/app/(customer)/venues/page.tsx`
- `apps/web/app/(customer)/owners/[slug]/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/venues/new/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/venues/[id]/edit/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/calendar/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/packages/new/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/packages/[id]/edit/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/business-profile/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/business-profile/preview/page.tsx`

Components:

- `apps/web/src/features/venues/ui/VenueDetails.tsx`
- `apps/web/src/features/venues/ui/VenueGallery.tsx`
- `apps/web/src/features/venues/ui/VenueFeaturedGallery.tsx`
- `apps/web/src/features/venues/ui/VenuePromotionalVideo.tsx`
- `apps/web/src/features/venues/ui/BookingSidebar.tsx`
- `apps/web/src/features/venues/ui/InquiryDialog.tsx`
- `apps/web/src/features/venues/ui/PackageComparePicker.tsx`
- `apps/web/src/features/venues/ui/ReviewsSection.tsx`
- `apps/web/src/components/venues/VenuePhotoUpload.tsx`
- `apps/web/src/components/venues/VenueVideoUpload.tsx`
- `apps/web/src/features/business-profiles/ui/BusinessProfileEditor.tsx`
- `apps/web/src/features/calendar/ui/BookingCalendar.tsx`

Application/domain:

- `apps/web/src/features/venues/application/actions.ts`
- `apps/web/src/features/venues/application/queries.ts`
- `apps/web/src/features/venues/application/package-actions.ts`
- `apps/web/src/features/venues/application/package-queries.ts`
- `apps/web/src/features/venues/utils/venue-media.ts`
- `apps/web/src/features/venues/utils/venue-mappers.ts`
- `apps/web/src/features/calendar/application/calendar-actions.ts`
- `apps/web/src/features/calendar/utils/availability.ts`
- `apps/web/src/features/owners/application/queries.ts`
- `apps/web/src/features/business-profiles/data/business-profile.repository.ts`
- `apps/web/src/features/event-planning/domain/event-plan.types.ts`
- `apps/web/src/features/event-planning/domain/event-plan.constants.ts`
- `apps/web/src/features/event-planning/utils/event-plan-search-mapper.ts`
- `apps/web/src/features/event-planning/components/EventPlanningWizard.tsx`

Migrations:

- `supabase/migrations/0040_venues.sql`
- `supabase/migrations/0045_venues_core.sql`
- `supabase/migrations/005_bookings.sql`
- `supabase/migrations/006_suppliers.sql`
- `supabase/migrations/007_reviews.sql`
- `supabase/migrations/012_storage.sql`
- `supabase/migrations/0795_business_profiles.sql`
- `supabase/migrations/20260720063605_public_owner_profiles.sql`
- `supabase/migrations/20260722043648_fix_owner_profile_public_slug_resolution.sql`
- `supabase/migrations/20260723300000_supplier_agreements.sql`
- `supabase/migrations/20260724000001_venue_package_enhancements.sql`
- `supabase/migrations/20260728161000_qualify_venue_media_object_path.sql`
- `supabase/migrations/20260730075945_create_event_plans.sql`
