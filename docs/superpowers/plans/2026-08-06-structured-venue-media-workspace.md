# Goal Description

Redesign the Media section in the Venue Profile Builder into a comprehensive workspace. The new workspace will allow venue owners to upload media directly, organize assets into structured galleries, assign metadata (captions, alt text), and manage space connections—all without leaving the structured profile editor or duplicating storage assets.

## Audit Before Implementation

1. **Current image-upload flow:** Users must currently leave the Structured Profile Builder, go to the Basic Listing page, upload photos there via `VenuePhotoUpload`, and return to assign them to galleries using the existing asset picker form.
2. **Current storage bucket and object-path strategy:** Venue images are stored in the `venue-images` Supabase bucket under the path `${organizationId}/${venueId}/${uniqueFileName}`.
3. **Current base-listing image model:** `venue_images` table stores canonical uploaded files with `storage_path`, `media_type`, and basic metadata.
4. **Current structured media model:** `VenueMediaItem` stores the assignments/items in a collection. `VenueMediaCollection` represents the galleries.
5. **Whether structured media references existing uploads or duplicates them:** It references them via `legacyVenueImageId` (or matching `storagePath`), allowing multiple assignments without duplicating the physical storage object.
6. **Current collection types:** `hero`, `gallery`, `space_gallery`, `video`, `logistics`.
7. **Current venue-level and space-level relationships:** A collection is venue-level if `spaceId` is null, and space-level if `spaceId` is set.
8. **Current cover-image behavior:** A collection can be a cover (`isCover`). A media item can be a gallery cover (`isFeatured`).
9. **Current image-ordering behavior:** Controlled via integer `displayOrder` fields on collections and items.
10. **Current draft/publication behavior:** Structured content follows a revisioning system (`DraftStructuredVenueProfile` -> `PublishedStructuredVenueProfile`). Changes to collections and items only affect the draft until publication.
11. **Current delete behavior:** Removing an item from a gallery archives/deletes the `VenueMediaItem` record (assignment) but leaves the base `venue_image` intact.
12. **Current RLS and authorization rules:** Strictly enforced via Supabase policies ensuring venue owners can only manage assets and collections for their organizations (`ensureVenueOwnerMembershipAction`).
13. **Current public venue gallery rendering:** Renders published profiles only, grouping items by collections.
14. **Current owner-preview rendering:** Owner preview respects the active draft profile's status, including draft collections and assignments.
15. **Existing reusable components:** `VenuePhotoUpload` exists but needs to be adapted or used as a standalone uploader without forcing users to leave the context.
16. **Current test coverage:** Relies on existing playwright browser tests and DB constraints.
17. **Schema limitations:** **None.** The existing database model already fully supports reusable assets, space connections, individual assignment captions/alt text, and cover selections. No migrations are required.

## User Review Required

> [!IMPORTANT]
> The database schema already perfectly supports all the requirements (reusable assets without duplication, distinct captions/alt text per assignment, space-level assignments, and distinct cover definitions). Therefore, **no database migrations or schema changes are needed**. We can proceed entirely with UI, UX, and client-server action orchestration improvements.

## Proposed Changes

### UI & Architecture Redesign

#### [MODIFY] media-workspace.tsx
- Transform into a master-detail layout (Gallery list on left, selected gallery on right).
- Implement responsive collapse for mobile devices.
- Integrate direct upload integration using `VenuePhotoUpload` or a new specialized wrapper.
- Integrate bulk actions toolbar.

#### [NEW] gallery-navigation.tsx
- Extract the list of collections into a dedicated component.
- Handle active collection selection and empty states.

#### [NEW] gallery-editor.tsx
- Render the asset grid for the currently selected collection.
- Support drag-and-drop or accessible button reordering.

#### [NEW] existing-asset-picker.tsx
- Dialog-based component showing all canonical `venue_images`.
- Allow multi-select and filter out images already in the active collection.

#### [NEW] media-details-panel.tsx
- A focused form to edit caption, alt text, and cover state for a selected assignment.
- Debounced autosave integration with existing server actions.

#### [MODIFY] structured-venue-editor-client.tsx
- Orchestrate state and server actions for the new child components.
- Expose required server actions (like `updateMediaItemMetadata`) to the detail panel.
