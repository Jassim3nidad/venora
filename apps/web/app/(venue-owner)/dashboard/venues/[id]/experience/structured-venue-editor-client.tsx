"use client";

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ImageIcon,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  PenLine,
} from "lucide-react";
import { cn } from "@venora/lib";
import { SpacesWorkspace } from "./_components/spaces-workspace/spaces-workspace";
import { MediaWorkspace } from "./_components/media-workspace/media-workspace";
import { LogisticsWorkspace } from "./_components/logistics-workspace/logistics-workspace";
import { FaqWorkspace } from "./_components/faq-workspace/faq-workspace";
import { PackageSpaceWorkspace } from "./_components/package-space-workspace/package-space-workspace";
import { ReviewPublishWorkspace } from "./_components/review-publish-workspace/review-publish-workspace";
import {
  DashButton,
  Panel,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import { VenueProfileHeader } from "./_components/venue-profile-header";
import { SubmitButton } from "./_components/submit-button";
import { SectionTitle } from "./_components/section-title";
import { ProfileSectionNavigation } from "./_components/profile-section-navigation";
import { SectionBadge } from "./_components/profile-section-status";
import {
  archiveVenueFaqAction,
  archiveVenueMediaItemAction,
  archiveVenueSpaceAction,
  createVenueFaqAction,
  createVenueSpaceAction,
  discardDraftStructuredVenueProfileAction,
  beginStructuredProfileEditAction,
  publishStructuredVenueProfileAction,
  reorderVenueFaqsAction,
  reorderVenueMediaItemsAction,
  reorderVenueSpacesAction,
  replaceCapacityLayoutsAction,
  replacePackageVenueSpacesAction,
  replaceSpaceAmenitiesAction,
  replaceSpaceEventTypesAction,
  saveVenueLogisticsAction,
  saveVenueMediaCollectionAction,
  saveVenueMediaItemAction,
  updateVenueMediaItemAction,
  updateVenueSpaceAction,
} from "@/src/features/venues/application/structured-profile-actions";
import {
  getPackageVenueSpaceInclusionTypeLabel,
  getVenueFaqCategoryLabel,
  getVenueMediaCollectionTypeLabel,
  getVenueSpaceLayoutLabel,
  getVenueSpaceSettingLabel,
  getVenueSpaceTypeLabel,
  PACKAGE_VENUE_SPACE_INCLUSION_TYPES,
  VENUE_FAQ_CATEGORIES,
  VENUE_MEDIA_COLLECTION_TYPES,
  VENUE_SPACE_LAYOUTS,
  VENUE_SPACE_SETTINGS,
  VENUE_SPACE_TYPES,
  type DraftStructuredVenueProfile,
  type PackageVenueSpaceInclusionType,
  type PublishedStructuredVenueProfile,
  type VenueFaqCategory,
  type VenueFaq,
  type VenueMediaCollectionType,
  type VenueMediaItem,
  type VenueSpace,
  type VenueSpaceLayout,
  type VenueSpaceSetting,
  type VenueSpaceType,
} from "@/src/features/venues/domain/structured-venue.types";
import {
  STRUCTURED_EDITOR_SECTIONS,
  getPublishBlockingIssues,
  getStructuredProfileDisplayStatus,
  getProfileSectionStatuses,
  type ProfileSectionId,
  type ProfileSectionStatus,
} from "@/src/features/venues/utils/structured-editor";
import { getVenueMediaUrl } from "@/src/features/venues/utils/venue-media";

type Venue = {
  id: string;
  organization_id: string;
  name: string;
  slug: string | null;
  status: string;
  city: string | null;
  province: string | null;
  address: string | null;
  description: string | null;
  capacity_min: number | null;
  capacity_max: number;
  indoor_outdoor: string | null;
  base_price: number;
  price_unit: string;
};

type Amenity = { id: string; name: string };
type EventType = { id: string; name: string };
type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: string;
  min_guests: number | null;
  max_guests: number | null;
  is_active: boolean;
};
export type VenueImage = {
  id: string;
  storage_path: string;
  media_type: string;
  alt_text: string | null;
  display_order: number | null;
  is_featured: boolean | null;
};
type CapacityLayoutRow = {
  id: string;
  space_id: string;
  layout: string;
  custom_layout_label: string | null;
  capacity: number;
  notes: string | null;
  display_order: number;
};
type SpaceAmenityRow = {
  space_id: string;
  amenity_id: string;
  notes: string | null;
};
type SpaceEventTypeRow = {
  space_id: string;
  event_type_id: string;
  notes: string | null;
};

export type ActionState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type Props = {
  venue: Venue;
  draftProfile: DraftStructuredVenueProfile | null;
  publishedProfile: PublishedStructuredVenueProfile | null;
  amenities: Amenity[];
  eventTypes: EventType[];
  packages: PackageRow[];
  venueImages: VenueImage[];
  capacityLayouts: CapacityLayoutRow[];
  spaceAmenities: SpaceAmenityRow[];
  spaceEventTypes: SpaceEventTypeRow[];
  canPublish: boolean;
  isCoordinatorOnly: boolean;
};

const inputClass =
  "min-h-12 w-full rounded-lg border border-[#cbd5e1] bg-white px-4 py-3 text-base font-semibold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]";
const textareaClass =
  "w-full rounded-lg border border-[#cbd5e1] bg-white px-4 py-3 text-base font-semibold leading-7 text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]";
const labelClass = "text-sm font-bold text-[#334155]";
const editorCardClass = "rounded-xl border border-[#dbe3ef] bg-white p-5 sm:p-6";

function peso(amount: number) {
  return `PHP ${Number(amount).toLocaleString("en-PH")}`;
}

function actionMessage(error?: { message: string } | null) {
  return error?.message ?? "Unable to save. Please try again.";
}

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function nullableField(form: FormData, name: string) {
  const value = field(form, name);
  return value ? value : null;
}

function nullableNumber(form: FormData, name: string) {
  const value = field(form, name);
  return value ? Number(value) : null;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function StructuredVenueEditorClient({
  venue,
  draftProfile,
  publishedProfile,
  amenities,
  eventTypes,
  packages,
  venueImages,
  capacityLayouts,
  spaceAmenities,
  spaceEventTypes,
  canPublish,
  isCoordinatorOnly,
}: Props) {
  const router = useRouter();
  const [section, setSection] =
    useState<ProfileSectionId>("overview");
  const [selectedSpaceId, setSelectedSpaceId] = useState(
    draftProfile?.spaces.find((space) => space.status !== "archived")?.id ?? "",
  );
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    message: "No changes in progress.",
  });
  const [isPending, startTransition] = useTransition();
  const activeSpaces = useMemo(
    () => (draftProfile?.spaces ?? []).filter((space) => space.status !== "archived"),
    [draftProfile],
  );
  const selectedSpace =
    selectedSpaceId === ""
      ? null
      : activeSpaces.find((space) => space.id === selectedSpaceId) ?? null;
  const statuses = getProfileSectionStatuses(
    draftProfile,
    packages.filter((item) => item.is_active).length,
  );
  const publishIssues = getPublishBlockingIssues(draftProfile);
  const profileStatus = getStructuredProfileDisplayStatus(
    draftProfile,
    publishedProfile?.revision.publishedAt,
  );

  function runAction<T>(
    message: string,
    fn: () => Promise<{ data: T | null; error: { message: string } | null }>,
  ) {
    setActionState({ status: "saving", message });
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setActionState({ status: "error", message: actionMessage(result.error) });
        return;
      }
      setActionState({ status: "saved", message: "Saved." });
      router.refresh();
    });
  }

  function createDraft() {
    runAction("Creating draft...", () =>
      beginStructuredProfileEditAction({ venueId: venue.id }),
    );
  }

  function publishDraft() {
    if (!draftProfile || publishIssues.length > 0) return;
    if (!window.confirm("Publish this structured profile to customers?")) return;
    runAction("Publishing...", () =>
      publishStructuredVenueProfileAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
      }),
    );
  }

  function discardDraft() {
    if (!draftProfile) return;
    if (
      !window.confirm(
        "Discard unpublished structured changes? Your current published venue remains visible.",
      )
    ) {
      return;
    }
    runAction("Discarding draft...", () =>
      discardDraftStructuredVenueProfileAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
      }),
    );
  }

  function saveSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftProfile) return;
    const form = new FormData(event.currentTarget);
    const name = field(form, "name");
    const payload = {
      venueId: venue.id,
      revisionId: draftProfile.revision.id,
      name,
      slug: field(form, "slug") || toSlug(name),
      spaceType: (field(form, "spaceType") || null) as VenueSpaceType | null,
      setting: field(form, "setting") as VenueSpaceSetting,
      shortDescription: nullableField(form, "shortDescription"),
      description: nullableField(form, "description"),
      capacityMin: nullableNumber(form, "capacityMin"),
      capacityMax: Number(field(form, "capacityMax") || 0),
      accessibilitySummary: nullableField(form, "accessibilitySummary"),
      restrictions: nullableField(form, "restrictions"),
      operatingNotes: nullableField(form, "operatingNotes"),
      displayOrder: selectedSpace?.displayOrder ?? activeSpaces.length,
    };

    runAction(selectedSpace ? "Saving space..." : "Adding space...", async () => {
      const result = selectedSpace
        ? await updateVenueSpaceAction({
            ...payload,
            spaceId: selectedSpace.id,
          })
        : await createVenueSpaceAction(payload);
      if (result.data && !selectedSpace) setSelectedSpaceId(result.data.id);
      return result;
    });
  }

  function saveSpaceCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftProfile || !selectedSpace) return;
    const form = new FormData(event.currentTarget);
    const layoutCount = Number(form.get("layoutCount") || 0);
    const layouts = Array.from({ length: layoutCount })
      .map((_, index) => {
        const layout = field(form, `layout-${index}`);
        const capacity = field(form, `layoutCapacity-${index}`);
        if (!layout || !capacity) return null;
        return {
          layout: layout as VenueSpaceLayout,
          customLayoutLabel: layout === "custom" ? nullableField(form, `customLayoutLabel-${index}`) : null,
          capacity: Number(capacity),
          notes: nullableField(form, `layoutNotes-${index}`),
          displayOrder: index,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    runAction("Saving capacity layouts...", () =>
      replaceCapacityLayoutsAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        spaceId: selectedSpace.id,
        spaceCapacityMax: selectedSpace.capacityMax,
        layouts,
      })
    );
  }

  function saveSpaceAmenities(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftProfile || !selectedSpace) return;
    const form = new FormData(event.currentTarget);
    const selectedAmenities = form
      .getAll("amenityIds")
      .map((id) => ({ amenityId: String(id) }));

    runAction("Saving amenities...", () =>
      replaceSpaceAmenitiesAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        spaceId: selectedSpace.id,
        amenities: selectedAmenities,
      })
    );
  }

  function saveSpaceEventTypes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftProfile || !selectedSpace) return;
    const form = new FormData(event.currentTarget);
    const selectedEventTypes = form
      .getAll("eventTypeIds")
      .map((id) => ({ eventTypeId: String(id) }));

    runAction("Saving event types...", () =>
      replaceSpaceEventTypesAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        spaceId: selectedSpace.id,
        eventTypes: selectedEventTypes,
      })
    );
  }

  function reorderSpace(spaceId: string, direction: "up" | "down") {
    if (!draftProfile) return;
    const index = activeSpaces.findIndex((space) => space.id === spaceId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= activeSpaces.length) return;
    const next = [...activeSpaces];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(nextIndex, 0, moved);
    runAction("Reordering spaces...", () =>
      reorderVenueSpacesAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        orderedIds: next.map((space) => space.id),
      }),
    );
  }

  function archiveSpace(space: VenueSpace) {
    if (!draftProfile) return;
    if (!window.confirm(`Archive ${space.name}? Existing packages are not deleted.`)) {
      return;
    }
    runAction("Archiving space...", () =>
      archiveVenueSpaceAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        spaceId: space.id,
      }),
    );
  }

  function saveLogistics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftProfile) return;
    const form = new FormData(event.currentTarget);
    runAction("Saving logistics...", () =>
      saveVenueLogisticsAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        parkingCapacity: nullableNumber(form, "parkingCapacity"),
        parkingNotes: nullableField(form, "parkingNotes"),
        accessibilityNotes: nullableField(form, "accessibilityNotes"),
        arrivalNotes: nullableField(form, "arrivalNotes"),
        publicTransportationNotes: nullableField(
          form,
          "publicTransportationNotes",
        ),
        weatherBackupAvailable: form.get("weatherBackupAvailable") === "on",
        weatherBackupNotes: nullableField(form, "weatherBackupNotes"),
        curfewTime: nullableField(form, "curfewTime"),
        noiseRestrictions: nullableField(form, "noiseRestrictions"),
        setupRules: nullableField(form, "setupRules"),
        teardownRules: nullableField(form, "teardownRules"),
        externalSupplierRules: nullableField(form, "externalSupplierRules"),
        petPolicy: nullableField(form, "petPolicy"),
        smokingPolicy: nullableField(form, "smokingPolicy"),
        otherNotes: nullableField(form, "otherNotes"),
      }),
    );
  }

  function createFaq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftProfile) return;
    const form = new FormData(event.currentTarget);
    runAction("Adding FAQ...", () =>
      createVenueFaqAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        question: field(form, "question"),
        answer: field(form, "answer"),
        category: (field(form, "category") || null) as VenueFaqCategory | null,
        displayOrder: draftProfile.faqs.length,
      }),
    );
    event.currentTarget.reset();
  }

  function reorderFaq(faqId: string, direction: "up" | "down") {
    if (!draftProfile) return;
    const activeFaqs = draftProfile.faqs.filter(
      (faq) => faq.status !== "archived",
    );
    const index = activeFaqs.findIndex((faq) => faq.id === faqId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= activeFaqs.length) return;
    const next = [...activeFaqs];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(nextIndex, 0, moved);
    runAction("Reordering FAQs...", () =>
      reorderVenueFaqsAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        orderedIds: next.map((faq) => faq.id),
      }),
    );
  }

  function archiveFaq(faq: VenueFaq) {
    if (!draftProfile) return;
    if (!window.confirm(`Archive this FAQ?\n\n${faq.question}`)) return;
    runAction("Archiving FAQ...", () =>
      archiveVenueFaqAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        faqId: faq.id,
      }),
    );
  }

  function createCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftProfile) return;
    const form = new FormData(event.currentTarget);
    runAction("Creating media collection...", () =>
      saveVenueMediaCollectionAction({
        venueId: venue.id,
        revisionId: draftProfile.revision.id,
        spaceId: field(form, "spaceId") || null,
        collectionType: field(form, "collectionType") as VenueMediaCollectionType,
        title: nullableField(form, "title"),
        description: nullableField(form, "description"),
        displayOrder: draftProfile.mediaCollections.length,
        isCover: form.get("isCover") === "on",
      }),
    );
  }

  function addExistingMedia(collectionId: string, images: VenueImage[]) {
    if (!draftProfile) return;
    const collection = draftProfile.mediaCollections.find(
      (item) => item.id === collectionId,
    );
    if (!collection) return;

    runAction("Adding media to gallery...", async () => {
      let lastResult: any = { error: null };
      
      for (const image of images) {
        if (!image) continue;

        // Since we are adding sequentially, we compute a rising display order locally or rely on the backend.
        // We just pass a basic 0 order since backend will append, or we use the current length.
        // For simplicity, we can pass 0 or a fixed length (it might overlap if done rapidly without waiting, but await fixes that)
        lastResult = await saveVenueMediaItemAction({
          venueId: venue.id,
          collectionId,
          spaceId: collection.spaceId,
          storagePath: image.storage_path,
          legacyVenueImageId: image.id,
          mediaType: image.media_type === "video" ? "video" : "image",
          altText: image.alt_text,
          caption: null,
          transcript: null,
          displayOrder: 999, // push to end
          isFeatured: false,
        });
        
        if (lastResult?.error) {
          break; // Stop on first error
        }
      }
      return lastResult;
    });
  }

  function reorderMediaItem(item: VenueMediaItem, direction: "up" | "down") {
    if (!draftProfile) return;
    const collectionItems = draftProfile.mediaItems.filter(
      (mediaItem) =>
        mediaItem.collectionId === item.collectionId &&
        mediaItem.status !== "archived" &&
        !mediaItem.deletedAt,
    );
    const index = collectionItems.findIndex(
      (mediaItem) => mediaItem.id === item.id,
    );
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= collectionItems.length) {
      return;
    }
    const next = [...collectionItems];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(nextIndex, 0, moved);
    runAction("Reordering media...", () =>
      reorderVenueMediaItemsAction({
        venueId: venue.id,
        collectionId: item.collectionId,
        orderedIds: next.map((mediaItem) => mediaItem.id),
      }),
    );
  }

  function updateMediaItem(item: VenueMediaItem, updates: Partial<VenueMediaItem>) {
    return runAction("Updating media...", () =>
      updateVenueMediaItemAction({
        venueId: venue.id,
        collectionId: item.collectionId,
        itemId: item.id,
        altText: updates.altText,
        caption: updates.caption,
        isFeatured: updates.isFeatured,
      }),
    );
  }

  function archiveMediaItem(item: VenueMediaItem) {
    if (!window.confirm("Archive this media item from the structured draft?")) {
      return;
    }
    runAction("Archiving media...", () =>
      archiveVenueMediaItemAction({
        venueId: venue.id,
        collectionId: item.collectionId,
        itemId: item.id,
      }),
    );
  }

  function savePackageSpaces(event: FormEvent<HTMLFormElement>, packageId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const links = form.getAll("spaceIds").map((spaceId, index) => ({
      spaceId: String(spaceId),
      inclusionType: field(form, `inclusionType-${spaceId}`) as PackageVenueSpaceInclusionType,
      inclusionNotes: nullableField(form, `notes-${spaceId}`),
      displayOrder: index,
    }));

    runAction("Saving package spaces...", () =>
      replacePackageVenueSpacesAction({
        venueId: venue.id,
        packageId,
        spaces: links,
      }),
    );
  }

  if (!draftProfile) {
    const isUpdating = !!publishedProfile;

    if (isUpdating) {
      const activeSpaces = publishedProfile.spaces;
      const activeCollections = publishedProfile.mediaCollections;
      const activeFaqs = publishedProfile.faqs;
      const activePackages = packages.filter(p => p.is_active);

      return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="min-h-[420px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#047857]">
                Structured profile published
              </span>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-[#0f172a]">
                Your structured profile is live
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#475569]">
                Your current structured profile is visible to customers. Editing creates a private draft, and the published version remains live until you publish the updates.
              </p>
              
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[#dbe3ef] bg-white p-4">
                  <span className="block text-xl font-bold text-[#0f172a]">{activeSpaces.length}</span>
                  <span className="text-xs font-medium text-[#64748b] uppercase tracking-wider">Spaces</span>
                </div>
                <div className="rounded-xl border border-[#dbe3ef] bg-white p-4">
                  <span className="block text-xl font-bold text-[#0f172a]">{activeCollections.length}</span>
                  <span className="text-xs font-medium text-[#64748b] uppercase tracking-wider">Galleries</span>
                </div>
                <div className="rounded-xl border border-[#dbe3ef] bg-white p-4">
                  <span className="block text-xl font-bold text-[#0f172a]">{activeFaqs.length}</span>
                  <span className="text-xs font-medium text-[#64748b] uppercase tracking-wider">FAQs</span>
                </div>
                <div className="rounded-xl border border-[#dbe3ef] bg-white p-4">
                  <span className="block text-xl font-bold text-[#0f172a]">{activePackages.length}</span>
                  <span className="text-xs font-medium text-[#64748b] uppercase tracking-wider">Packages</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={createDraft}
                  disabled={isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af] disabled:opacity-60"
                >
                  <PenLine className="h-4 w-4" />
                  Edit profile
                </button>
                <DashButton
                  href={`/venues/${venue.slug ?? venue.id}`}
                  variant="secondary"
                  icon="visibility"
                  className="h-11 rounded-xl bg-white"
                >
                  View public profile
                </DashButton>
              </div>
            </div>
          </Panel>
          <VenueProfileHeader
            venue={venue}
            profileStatus={profileStatus}
            actionState={actionState}
            canPublish={canPublish}
            publishIssues={publishIssues}
            hasDraft={false}
            onPublish={publishDraft}
            onDiscard={discardDraft}
          />
        </div>
      );
    }

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="min-h-[420px]">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#1d4ed8]">
              Structured profile
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-[#0f172a]">
              Prepare a richer venue experience
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#475569]">
              Your current public venue page remains visible while you build a private structured draft for spaces, media groups, logistics, FAQs, and package-space relationships.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Private draft", "Preview before publish", "Owner approval"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-[#dbe3ef] bg-[#f8fbff] p-4 text-sm font-bold text-[#0f172a]"
                  >
                    <CheckCircle2 className="mb-3 h-5 w-5 text-[#1d4ed8]" />
                    {item}
                  </div>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={createDraft}
              disabled={isPending}
              className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200/70 transition hover:bg-[#1e40af] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Create structured profile
            </button>
          </div>
        </Panel>
        <VenueProfileHeader
          venue={venue}
          profileStatus={profileStatus}
          actionState={actionState}
          canPublish={canPublish}
          publishIssues={publishIssues}
          hasDraft={false}
          onPublish={publishDraft}
          onDiscard={discardDraft}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VenueProfileHeader
        venue={venue}
        profileStatus={profileStatus}
        actionState={actionState}
        canPublish={canPublish}
        publishIssues={publishIssues}
        hasDraft={true}
        onPublish={publishDraft}
        onDiscard={discardDraft}
      />

      <div className="grid gap-6 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <ProfileSectionNavigation
          currentSection={section}
          onSectionChange={setSection}
          statuses={statuses}
        />

      <div className="min-w-0 space-y-6">
        {section === "overview" ? (
          <OverviewSection
            venue={venue}
            draftProfile={draftProfile}
            publishedProfile={publishedProfile}
            statuses={statuses}
          />
        ) : null}
        {section === "spaces" ? (
          <SpacesWorkspace
            spaces={activeSpaces}
            selectedSpaceId={selectedSpaceId}
            setSelectedSpaceId={setSelectedSpaceId}
            capacityLayouts={capacityLayouts}
            spaceAmenities={spaceAmenities}
            spaceEventTypes={spaceEventTypes}
            amenities={amenities}
            eventTypes={eventTypes}
            onSaveSpace={saveSpace}
            onSaveCapacity={saveSpaceCapacity}
            onSaveAmenities={saveSpaceAmenities}
            onSaveEventTypes={saveSpaceEventTypes}
            onReorder={reorderSpace}
            onArchive={archiveSpace}
          />
        ) : null}
        {section === "media" ? (
          <MediaWorkspace
            profile={draftProfile}
            spaces={activeSpaces}
            venueImages={venueImages}
            onCreateCollection={createCollection}
            onAddExistingMedia={addExistingMedia}
            onArchiveItem={archiveMediaItem}
            onReorderItem={reorderMediaItem}
            onUpdateItem={updateMediaItem}
            organizationId={venue.organization_id}
          />
        ) : null}
        {section === "logistics" ? (
          <LogisticsWorkspace profile={draftProfile} onSave={saveLogistics} />
        ) : null}
        {section === "faqs" ? (
          <FaqWorkspace
            profile={draftProfile}
            onCreate={createFaq}
            onArchive={archiveFaq}
            onReorder={reorderFaq}
          />
        ) : null}
        {section === "packages" ? (
          <PackageSpaceWorkspace
            packages={packages}
            spaces={activeSpaces}
            profile={draftProfile}
            onSave={savePackageSpaces}
          />
        ) : null}
        {section === "review" ? (
          <ReviewPublishWorkspace
            venue={venue}
            profile={draftProfile}
            statuses={statuses}
            canPublish={canPublish}
            onPublish={publishDraft}
            onNavigate={(id) => setSection(id)}
          />
        ) : null}
      </div>
      </div>
    </div>
  );
}



function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dbe3ef] bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[#0f172a]">{value}</p>
    </div>
  );
}

function OverviewSection({
  venue,
  draftProfile,
  publishedProfile,
  statuses,
}: {
  venue: Venue;
  draftProfile: DraftStructuredVenueProfile;
  publishedProfile: PublishedStructuredVenueProfile | null;
  statuses: Record<ProfileSectionId, ProfileSectionStatus>;
}) {
  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Overview</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#64748b]">
            This draft is private. It becomes customer-visible only after an owner publishes it.
          </p>
        </div>
        <StatusBadge status={venue.status} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Draft revision" value={`#${draftProfile.revision.revisionNumber}`} />
        <Metric label="Spaces" value={String(draftProfile.spaces.length)} />
        <Metric label="Media items" value={String(draftProfile.mediaItems.length)} />
        <Metric
          label="Published"
          value={
            publishedProfile?.revision.publishedAt
              ? new Date(publishedProfile.revision.publishedAt).toLocaleDateString()
              : "Not yet"
          }
        />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {STRUCTURED_EDITOR_SECTIONS.filter((item) => item.id !== "overview").map(
          (item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#dbe3ef] bg-[#f8fbff] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-[#0f172a]">{item.label}</p>
                <SectionBadge status={statuses[item.id].completionState} />
              </div>
              <p className="mt-1 text-sm leading-5 text-[#64748b]">
                {item.description}
              </p>
            </div>
          ),
        )}
      </div>
    </Panel>
  );
}












function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2.5", className)}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function CheckboxGrid({
  label,
  name,
  items,
  selectedIds,
}: {
  label: string;
  name: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: Set<string>;
}) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-[#dbe3ef] bg-white px-4 py-3 text-sm font-semibold text-[#334155]"
          >
            <input
              type="checkbox"
              name={name}
              value={item.id}
              defaultChecked={selectedIds.has(item.id)}
              className="h-4 w-4"
            />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}


