import type {
  DraftStructuredVenueProfile,
  PublishedStructuredVenueProfile,
  VenueFaq,
  VenueLogistics,
  VenueMediaCollection,
  VenueMediaItem,
  VenueProfileRevision,
  VenueSpace,
  VenueSpaceAmenity,
  VenueSpaceCapacityLayout,
  VenueSpaceEventType,
} from "../domain/structured-venue.types";
import type {
  CapacityLayoutsInput,
  CreateVenueSpaceInput,
  MediaCollectionInput,
  MediaItemInput,
  PackageVenueSpacesInput,
  SpaceAmenitiesInput,
  SpaceEventTypesInput,
  UpdateVenueSpaceInput,
  VenueFaqInput,
  VenueLogisticsInput,
} from "../schemas/structured-venue.schema";

type DbError = {
  code?: string;
  message?: string;
};

type DbResponse<T> = {
  data: T | null;
  error: DbError | null;
};

export type StructuredVenueQuery<T = unknown> = PromiseLike<DbResponse<T>> & {
  select(columns?: string): StructuredVenueQuery<T>;
  insert(values: unknown): StructuredVenueQuery<T>;
  update(values: unknown): StructuredVenueQuery<T>;
  upsert(values: unknown, options?: unknown): StructuredVenueQuery<T>;
  delete(): StructuredVenueQuery<T>;
  eq(column: string, value: unknown): StructuredVenueQuery<T>;
  in(column: string, values: readonly unknown[]): StructuredVenueQuery<T>;
  order(
    column: string,
    options?: { ascending?: boolean; referencedTable?: string },
  ): StructuredVenueQuery<T>;
  limit(count: number): StructuredVenueQuery<T>;
  maybeSingle(): PromiseLike<DbResponse<T | null>>;
  single(): PromiseLike<DbResponse<T>>;
};

export type StructuredVenueDataClient = {
  from<T = unknown>(table: string): StructuredVenueQuery<T>;
};

export type StructuredVenueRepositoryErrorCode =
  | "not_found"
  | "forbidden"
  | "conflict"
  | "database_error";

export type StructuredVenueRepositoryError = {
  code: StructuredVenueRepositoryErrorCode;
  message: string;
};

export type StructuredVenueRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: StructuredVenueRepositoryError };

type RevisionRow = {
  id: string;
  venue_id: string;
  status: "draft" | "published" | "archived";
  revision_number: number;
  created_from_revision_id: string | null;
  published_at: string | null;
  published_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type VenueSpaceRow = {
  id: string;
  revision_id: string;
  venue_id: string;
  space_key: string;
  name: string;
  slug: string;
  space_type: VenueSpace["spaceType"];
  setting: VenueSpace["setting"];
  short_description: string | null;
  description: string | null;
  capacity_min: number | null;
  capacity_max: number;
  accessibility_summary: string | null;
  restrictions: string | null;
  operating_notes: string | null;
  display_order: number;
  status: VenueSpace["status"];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type CapacityLayoutRow = {
  id: string;
  space_id: string;
  layout: VenueSpaceCapacityLayout["layout"];
  custom_layout_label: string | null;
  capacity: number;
  notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type SpaceAmenityRow = {
  space_id: string;
  amenity_id: string;
  notes: string | null;
  created_at: string;
};

type SpaceEventTypeRow = {
  space_id: string;
  event_type_id: string;
  notes: string | null;
  created_at: string;
};

type MediaCollectionRow = {
  id: string;
  revision_id: string;
  venue_id: string;
  space_id: string | null;
  collection_type: VenueMediaCollection["collectionType"];
  title: string | null;
  description: string | null;
  display_order: number;
  is_cover: boolean;
  status: VenueMediaCollection["status"];
  created_at: string;
  updated_at: string;
};

type MediaItemRow = {
  id: string;
  collection_id: string;
  venue_id: string;
  space_id: string | null;
  storage_path: string;
  legacy_venue_image_id: string | null;
  media_type: VenueMediaItem["mediaType"];
  alt_text: string | null;
  caption: string | null;
  transcript: string | null;
  display_order: number;
  is_featured: boolean;
  status: VenueMediaItem["status"];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type LogisticsRow = {
  id: string;
  revision_id: string;
  venue_id: string;
  parking_summary: string | null;
  parking_capacity: number | null;
  accessibility_summary: string | null;
  loading_area_notes: string | null;
  load_in_notes: string | null;
  catering_policy: string | null;
  outside_supplier_policy: string | null;
  alcohol_policy: string | null;
  noise_policy: string | null;
  curfew_time: string | null;
  security_notes: string | null;
  restroom_notes: string | null;
  weather_contingency: string | null;
  status: VenueLogistics["status"];
  created_at: string;
  updated_at: string;
};

type FaqRow = {
  id: string;
  revision_id: string;
  venue_id: string;
  question: string;
  answer: string;
  category: VenueFaq["category"];
  display_order: number;
  status: VenueFaq["status"];
  created_at: string;
  updated_at: string;
};

type PackageVenueSpaceRow = {
  id: string;
  package_id: string;
  space_id: string;
  venue_id: string;
  inclusion_type: PackageVenueSpacesInput["spaces"][number]["inclusionType"];
  inclusion_notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

const revisionColumns =
  "id, venue_id, status, revision_number, created_from_revision_id, published_at, published_by, archived_at, created_at, updated_at";
const spaceColumns =
  "id, revision_id, venue_id, space_key, name, slug, space_type, setting, short_description, description, capacity_min, capacity_max, accessibility_summary, restrictions, operating_notes, display_order, status, archived_at, created_at, updated_at";
const capacityLayoutColumns =
  "id, space_id, layout, custom_layout_label, capacity, notes, display_order, created_at, updated_at";
const spaceAmenityColumns = "space_id, amenity_id, notes, created_at";
const spaceEventTypeColumns = "space_id, event_type_id, notes, created_at";
const mediaCollectionColumns =
  "id, revision_id, venue_id, space_id, collection_type, title, description, display_order, is_cover, status, created_at, updated_at";
const mediaItemColumns =
  "id, collection_id, venue_id, space_id, storage_path, legacy_venue_image_id, media_type, alt_text, caption, transcript, display_order, is_featured, status, deleted_at, created_at, updated_at";
const logisticsColumns =
  "id, revision_id, venue_id, parking_summary, parking_capacity, accessibility_summary, loading_area_notes, load_in_notes, catering_policy, outside_supplier_policy, alcohol_policy, noise_policy, curfew_time, security_notes, restroom_notes, weather_contingency, status, created_at, updated_at";
const faqColumns =
  "id, revision_id, venue_id, question, answer, category, display_order, status, created_at, updated_at";
const packageVenueSpaceColumns =
  "id, package_id, space_id, venue_id, inclusion_type, inclusion_notes, display_order, created_at, updated_at";

function mapError(error: DbError): StructuredVenueRepositoryError {
  if (error.code === "PGRST116") {
    return {
      code: "not_found",
      message: "Venue profile content not found.",
    };
  }

  if (error.code === "42501") {
    return {
      code: "forbidden",
      message: "You do not have permission to manage this venue profile.",
    };
  }

  if (error.code === "23505") {
    return {
      code: "conflict",
      message: "This venue profile change conflicts with existing content.",
    };
  }

  return {
    code: "database_error",
    message: "The venue profile could not be saved. Please try again.",
  };
}

function ok<T>(data: T): StructuredVenueRepositoryResult<T> {
  return { ok: true, data };
}

function fail<T>(error: StructuredVenueRepositoryError): StructuredVenueRepositoryResult<T> {
  return { ok: false, error };
}

async function runQuery<T>(
  query: PromiseLike<DbResponse<T>>,
): Promise<StructuredVenueRepositoryResult<T>> {
  const { data, error } = await query;

  if (error) return fail(mapError(error));
  if (data === null) {
    return fail({ code: "not_found", message: "Venue profile content not found." });
  }

  return ok(data);
}

async function runMutation(
  query: PromiseLike<DbResponse<unknown>>,
): Promise<StructuredVenueRepositoryResult<true>> {
  const { error } = await query;
  if (error) return fail(mapError(error));
  return ok(true);
}

function mapRevision(row: RevisionRow): VenueProfileRevision {
  return {
    id: row.id,
    venueId: row.venue_id,
    status: row.status,
    revisionNumber: row.revision_number,
    createdFromRevisionId: row.created_from_revision_id,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSpace(row: VenueSpaceRow): VenueSpace {
  return {
    id: row.id,
    revisionId: row.revision_id,
    venueId: row.venue_id,
    spaceKey: row.space_key,
    name: row.name,
    slug: row.slug,
    spaceType: row.space_type,
    setting: row.setting,
    shortDescription: row.short_description,
    description: row.description,
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max,
    accessibilitySummary: row.accessibility_summary,
    restrictions: row.restrictions,
    operatingNotes: row.operating_notes,
    displayOrder: row.display_order,
    status: row.status,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCapacityLayout(row: CapacityLayoutRow): VenueSpaceCapacityLayout {
  return {
    id: row.id,
    spaceId: row.space_id,
    layout: row.layout,
    customLayoutLabel: row.custom_layout_label,
    capacity: row.capacity,
    notes: row.notes,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSpaceAmenity(row: SpaceAmenityRow): VenueSpaceAmenity {
  return {
    spaceId: row.space_id,
    amenityId: row.amenity_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapSpaceEventType(row: SpaceEventTypeRow): VenueSpaceEventType {
  return {
    spaceId: row.space_id,
    eventTypeId: row.event_type_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapMediaCollection(row: MediaCollectionRow): VenueMediaCollection {
  return {
    id: row.id,
    revisionId: row.revision_id,
    venueId: row.venue_id,
    spaceId: row.space_id,
    collectionType: row.collection_type,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isCover: row.is_cover,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMediaItem(row: MediaItemRow): VenueMediaItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    venueId: row.venue_id,
    spaceId: row.space_id,
    storagePath: row.storage_path,
    legacyVenueImageId: row.legacy_venue_image_id,
    mediaType: row.media_type,
    externalUrl: null,
    externalProvider: null,
    altText: row.alt_text,
    caption: row.caption,
    transcript: row.transcript,
    displayOrder: row.display_order,
    isFeatured: row.is_featured,
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLogistics(row: LogisticsRow): VenueLogistics {
  return {
    id: row.id,
    revisionId: row.revision_id,
    venueId: row.venue_id,
    parkingCapacity: row.parking_capacity,
    parkingNotes: row.parking_summary,
    accessibilityNotes: row.accessibility_summary,
    arrivalNotes: row.loading_area_notes,
    publicTransportationNotes: row.load_in_notes,
    weatherBackupAvailable: row.weather_contingency ? true : null,
    weatherBackupNotes: row.weather_contingency,
    curfewTime: row.curfew_time,
    noiseRestrictions: row.noise_policy,
    setupRules: row.catering_policy,
    teardownRules: row.security_notes,
    externalSupplierRules: row.outside_supplier_policy,
    petPolicy: null,
    smokingPolicy: null,
    otherNotes: row.alcohol_policy ?? row.restroom_notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFaq(row: FaqRow): VenueFaq {
  return {
    id: row.id,
    revisionId: row.revision_id,
    venueId: row.venue_id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    displayOrder: row.display_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPackageVenueSpace(row: PackageVenueSpaceRow) {
  return {
    id: row.id,
    packageId: row.package_id,
    spaceId: row.space_id,
    venueId: row.venue_id,
    inclusionType: row.inclusion_type,
    inclusionNotes: row.inclusion_notes,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function spaceInsert(input: CreateVenueSpaceInput) {
  return {
    revision_id: input.revisionId,
    venue_id: input.venueId,
    name: input.name,
    slug: input.slug,
    space_type: input.spaceType ?? null,
    setting: input.setting,
    short_description: input.shortDescription ?? null,
    description: input.description ?? null,
    capacity_min: input.capacityMin ?? null,
    capacity_max: input.capacityMax,
    accessibility_summary: input.accessibilitySummary ?? null,
    restrictions: input.restrictions ?? null,
    operating_notes: input.operatingNotes ?? null,
    display_order: input.displayOrder,
    status: "draft",
  };
}

function spaceUpdate(input: UpdateVenueSpaceInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.spaceType !== undefined ? { space_type: input.spaceType ?? null } : {}),
    ...(input.setting !== undefined ? { setting: input.setting } : {}),
    ...(input.shortDescription !== undefined
      ? { short_description: input.shortDescription ?? null }
      : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    ...(input.capacityMin !== undefined ? { capacity_min: input.capacityMin ?? null } : {}),
    ...(input.capacityMax !== undefined ? { capacity_max: input.capacityMax } : {}),
    ...(input.accessibilitySummary !== undefined
      ? { accessibility_summary: input.accessibilitySummary ?? null }
      : {}),
    ...(input.restrictions !== undefined ? { restrictions: input.restrictions ?? null } : {}),
    ...(input.operatingNotes !== undefined
      ? { operating_notes: input.operatingNotes ?? null }
      : {}),
    ...(input.displayOrder !== undefined ? { display_order: input.displayOrder } : {}),
  };
}

function logisticsPayload(input: VenueLogisticsInput) {
  return {
    revision_id: input.revisionId,
    venue_id: input.venueId,
    parking_capacity: input.parkingCapacity ?? null,
    parking_summary: input.parkingNotes ?? null,
    accessibility_summary: input.accessibilityNotes ?? null,
    loading_area_notes: input.arrivalNotes ?? null,
    load_in_notes: input.publicTransportationNotes ?? null,
    weather_contingency: input.weatherBackupNotes ?? null,
    curfew_time: input.curfewTime ?? null,
    noise_policy: input.noiseRestrictions ?? null,
    catering_policy: input.setupRules ?? null,
    security_notes: input.teardownRules ?? null,
    outside_supplier_policy: input.externalSupplierRules ?? null,
    alcohol_policy: input.otherNotes ?? null,
    status: "draft",
  };
}

async function listRows<T>(
  query: PromiseLike<DbResponse<T[]>>,
): Promise<StructuredVenueRepositoryResult<T[]>> {
  const { data, error } = await query;
  if (error) return fail(mapError(error));
  return ok(data ?? []);
}

export const structuredVenueProfileRepository = {
  async findDraftRevisionForVenue(
    client: StructuredVenueDataClient,
    venueId: string,
  ): Promise<StructuredVenueRepositoryResult<VenueProfileRevision | null>> {
    const { data, error } = await client
      .from<RevisionRow>("venue_profile_revisions")
      .select(revisionColumns)
      .eq("venue_id", venueId)
      .eq("status", "draft")
      .maybeSingle();

    if (error) return fail(mapError(error));
    return ok(data ? mapRevision(data) : null);
  },

  async findPublishedRevisionForVenue(
    client: StructuredVenueDataClient,
    venueId: string,
  ): Promise<StructuredVenueRepositoryResult<VenueProfileRevision | null>> {
    const { data, error } = await client
      .from<RevisionRow>("venue_profile_revisions")
      .select(revisionColumns)
      .eq("venue_id", venueId)
      .eq("status", "published")
      .maybeSingle();

    if (error) return fail(mapError(error));
    return ok(data ? mapRevision(data) : null);
  },

  async getOrCreateDraftRevisionForVenue(
    client: StructuredVenueDataClient,
    venueId: string,
  ): Promise<StructuredVenueRepositoryResult<VenueProfileRevision>> {
    const draft = await this.findDraftRevisionForVenue(client, venueId);
    if (!draft.ok) return draft;
    if (draft.data) return ok(draft.data);

    const latest = await client
      .from<RevisionRow>("venue_profile_revisions")
      .select(revisionColumns)
      .eq("venue_id", venueId)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest.error) return fail(mapError(latest.error));

    const created = await runQuery(
      client
        .from<RevisionRow>("venue_profile_revisions")
        .insert({
          venue_id: venueId,
          status: "draft",
          revision_number: latest.data ? latest.data.revision_number + 1 : 1,
          created_from_revision_id: latest.data?.id ?? null,
        })
        .select(revisionColumns)
        .single(),
    );

    return created.ok ? ok(mapRevision(created.data)) : created;
  },

  async publishDraftRevisionForVenue(
    client: StructuredVenueDataClient,
    input: { venueId: string; revisionId: string; publishedBy: string },
  ): Promise<StructuredVenueRepositoryResult<VenueProfileRevision>> {
    const archived = await runMutation(
      client
        .from("venue_profile_revisions")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("venue_id", input.venueId)
        .eq("status", "published"),
    );
    if (!archived.ok) return archived;

    const published = await runQuery(
      client
        .from<RevisionRow>("venue_profile_revisions")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          published_by: input.publishedBy,
          archived_at: null,
        })
        .eq("id", input.revisionId)
        .eq("venue_id", input.venueId)
        .select(revisionColumns)
        .single(),
    );
    if (!published.ok) return published;

    for (const table of ["venue_spaces", "venue_media_collections", "venue_faqs"]) {
      const result = await runMutation(
        client
          .from(table)
          .update({ status: "published", archived_at: null })
          .eq("revision_id", input.revisionId)
          .eq("venue_id", input.venueId),
      );
      if (!result.ok) return result;
    }

    const publishedCollections = await listRows(
      client
        .from<MediaCollectionRow[]>("venue_media_collections")
        .select(mediaCollectionColumns)
        .eq("revision_id", input.revisionId)
        .eq("venue_id", input.venueId),
    );
    if (!publishedCollections.ok) return publishedCollections;

    const collectionIds = publishedCollections.data.map((collection) => collection.id);
    if (collectionIds.length > 0) {
      const mediaResult = await runMutation(
        client
          .from("venue_media_items")
          .update({ status: "published" })
          .eq("venue_id", input.venueId)
          .in("collection_id", collectionIds),
      );
      if (!mediaResult.ok) return mediaResult;
    }

    const logisticsResult = await runMutation(
      client
        .from("venue_logistics")
        .update({ status: "published" })
        .eq("revision_id", input.revisionId)
        .eq("venue_id", input.venueId),
    );
    if (!logisticsResult.ok) return logisticsResult;

    return ok(mapRevision(published.data));
  },

  async discardDraftRevisionForVenue(
    client: StructuredVenueDataClient,
    input: { venueId: string; revisionId: string },
  ): Promise<StructuredVenueRepositoryResult<VenueProfileRevision>> {
    const result = await runQuery(
      client
        .from<RevisionRow>("venue_profile_revisions")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", input.revisionId)
        .eq("venue_id", input.venueId)
        .eq("status", "draft")
        .select(revisionColumns)
        .single(),
    );

    return result.ok ? ok(mapRevision(result.data)) : result;
  },

  async createVenueSpace(
    client: StructuredVenueDataClient,
    input: CreateVenueSpaceInput,
  ): Promise<StructuredVenueRepositoryResult<VenueSpace>> {
    const result = await runQuery(
      client
        .from<VenueSpaceRow>("venue_spaces")
        .insert(spaceInsert(input))
        .select(spaceColumns)
        .single(),
    );

    return result.ok ? ok(mapSpace(result.data)) : result;
  },

  async updateVenueSpace(
    client: StructuredVenueDataClient,
    input: UpdateVenueSpaceInput,
  ): Promise<StructuredVenueRepositoryResult<VenueSpace>> {
    const result = await runQuery(
      client
        .from<VenueSpaceRow>("venue_spaces")
        .update(spaceUpdate(input))
        .eq("id", input.spaceId)
        .eq("venue_id", input.venueId)
        .eq("revision_id", input.revisionId)
        .select(spaceColumns)
        .single(),
    );

    return result.ok ? ok(mapSpace(result.data)) : result;
  },

  async reorderVenueSpaces(
    client: StructuredVenueDataClient,
    input: { venueId: string; revisionId: string; orderedIds: string[] },
  ): Promise<StructuredVenueRepositoryResult<true>> {
    for (const [displayOrder, spaceId] of input.orderedIds.entries()) {
      const result = await runMutation(
        client
          .from("venue_spaces")
          .update({ display_order: displayOrder })
          .eq("id", spaceId)
          .eq("venue_id", input.venueId)
          .eq("revision_id", input.revisionId),
      );
      if (!result.ok) return result;
    }

    return ok(true);
  },

  async archiveVenueSpace(
    client: StructuredVenueDataClient,
    input: { venueId: string; revisionId: string; spaceId: string },
  ): Promise<StructuredVenueRepositoryResult<VenueSpace>> {
    const result = await runQuery(
      client
        .from<VenueSpaceRow>("venue_spaces")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", input.spaceId)
        .eq("venue_id", input.venueId)
        .eq("revision_id", input.revisionId)
        .select(spaceColumns)
        .single(),
    );

    return result.ok ? ok(mapSpace(result.data)) : result;
  },

  async replaceCapacityLayouts(
    client: StructuredVenueDataClient,
    input: CapacityLayoutsInput,
  ): Promise<StructuredVenueRepositoryResult<VenueSpaceCapacityLayout[]>> {
    const deleted = await runMutation(
      client.from("venue_space_capacity_layouts").delete().eq("space_id", input.spaceId),
    );
    if (!deleted.ok) return deleted;

    const result = await listRows(
      client
      .from<CapacityLayoutRow[]>("venue_space_capacity_layouts")
        .insert(
          input.layouts.map((layout) => ({
            space_id: input.spaceId,
            layout: layout.layout,
            custom_layout_label: layout.customLayoutLabel ?? null,
            capacity: layout.capacity,
            notes: layout.notes ?? null,
            display_order: layout.displayOrder,
          })),
        )
        .select(capacityLayoutColumns)
        .order("display_order"),
    );

    return result.ok ? ok(result.data.map(mapCapacityLayout)) : result;
  },

  async replaceSpaceAmenities(
    client: StructuredVenueDataClient,
    input: SpaceAmenitiesInput,
  ): Promise<StructuredVenueRepositoryResult<VenueSpaceAmenity[]>> {
    const deleted = await runMutation(
      client.from("venue_space_amenities").delete().eq("space_id", input.spaceId),
    );
    if (!deleted.ok) return deleted;
    if (input.amenities.length === 0) return ok([]);

    const result = await listRows(
      client
        .from<SpaceAmenityRow[]>("venue_space_amenities")
        .insert(
          input.amenities.map((amenity) => ({
            space_id: input.spaceId,
            amenity_id: amenity.amenityId,
            notes: amenity.notes ?? null,
          })),
        )
        .select(spaceAmenityColumns),
    );

    return result.ok ? ok(result.data.map(mapSpaceAmenity)) : result;
  },

  async replaceSpaceEventTypes(
    client: StructuredVenueDataClient,
    input: SpaceEventTypesInput,
  ): Promise<StructuredVenueRepositoryResult<VenueSpaceEventType[]>> {
    const deleted = await runMutation(
      client.from("venue_space_event_types").delete().eq("space_id", input.spaceId),
    );
    if (!deleted.ok) return deleted;
    if (input.eventTypes.length === 0) return ok([]);

    const result = await listRows(
      client
        .from<SpaceEventTypeRow[]>("venue_space_event_types")
        .insert(
          input.eventTypes.map((eventType) => ({
            space_id: input.spaceId,
            event_type_id: eventType.eventTypeId,
            notes: eventType.notes ?? null,
          })),
        )
        .select(spaceEventTypeColumns),
    );

    return result.ok ? ok(result.data.map(mapSpaceEventType)) : result;
  },

  async upsertMediaCollection(
    client: StructuredVenueDataClient,
    input: MediaCollectionInput,
  ): Promise<StructuredVenueRepositoryResult<VenueMediaCollection>> {
    const result = await runQuery(
      client
        .from<MediaCollectionRow>("venue_media_collections")
        .insert({
          revision_id: input.revisionId,
          venue_id: input.venueId,
          space_id: input.spaceId ?? null,
          collection_type: input.collectionType,
          title: input.title ?? null,
          description: input.description ?? null,
          display_order: input.displayOrder,
          is_cover: input.isCover,
          status: "draft",
        })
        .select(mediaCollectionColumns)
        .single(),
    );

    return result.ok ? ok(mapMediaCollection(result.data)) : result;
  },

  async upsertMediaItem(
    client: StructuredVenueDataClient,
    input: MediaItemInput,
  ): Promise<StructuredVenueRepositoryResult<VenueMediaItem>> {
    const result = await runQuery(
      client
        .from<MediaItemRow>("venue_media_items")
        .insert({
          collection_id: input.collectionId,
          venue_id: input.venueId,
          space_id: input.spaceId ?? null,
          storage_path: input.storagePath ?? "",
          legacy_venue_image_id: input.legacyVenueImageId ?? null,
          media_type: input.mediaType,
          alt_text: input.altText ?? null,
          caption: input.caption ?? null,
          transcript: input.transcript ?? null,
          display_order: input.displayOrder,
          is_featured: input.isFeatured,
          status: "draft",
        })
        .select(mediaItemColumns)
        .single(),
    );

    return result.ok ? ok(mapMediaItem(result.data)) : result;
  },

  async upsertVenueLogistics(
    client: StructuredVenueDataClient,
    input: VenueLogisticsInput,
  ): Promise<StructuredVenueRepositoryResult<VenueLogistics>> {
    const result = await runQuery(
      client
        .from<LogisticsRow>("venue_logistics")
        .upsert(logisticsPayload(input), { onConflict: "revision_id" })
        .select(logisticsColumns)
        .single(),
    );

    return result.ok ? ok(mapLogistics(result.data)) : result;
  },

  async createVenueFaq(
    client: StructuredVenueDataClient,
    input: VenueFaqInput,
  ): Promise<StructuredVenueRepositoryResult<VenueFaq>> {
    const result = await runQuery(
      client
        .from<FaqRow>("venue_faqs")
        .insert({
          revision_id: input.revisionId,
          venue_id: input.venueId,
          question: input.question,
          answer: input.answer,
          category: input.category ?? null,
          display_order: input.displayOrder,
          status: "draft",
        })
        .select(faqColumns)
        .single(),
    );

    return result.ok ? ok(mapFaq(result.data)) : result;
  },

  async replacePackageVenueSpaces(
    client: StructuredVenueDataClient,
    input: PackageVenueSpacesInput,
  ): Promise<StructuredVenueRepositoryResult<ReturnType<typeof mapPackageVenueSpace>[]>> {
    const deleted = await runMutation(
      client
        .from("package_venue_spaces")
        .delete()
        .eq("package_id", input.packageId)
        .eq("venue_id", input.venueId),
    );
    if (!deleted.ok) return deleted;
    if (input.spaces.length === 0) return ok([]);

    const result = await listRows(
      client
        .from<PackageVenueSpaceRow[]>("package_venue_spaces")
        .insert(
          input.spaces.map((space) => ({
            package_id: input.packageId,
            venue_id: input.venueId,
            space_id: space.spaceId,
            inclusion_type: space.inclusionType,
            inclusion_notes: space.inclusionNotes ?? null,
            display_order: space.displayOrder,
          })),
        )
        .select(packageVenueSpaceColumns)
        .order("display_order"),
    );

    return result.ok ? ok(result.data.map(mapPackageVenueSpace)) : result;
  },

  async findDraftProfileForVenue(
    client: StructuredVenueDataClient,
    venueId: string,
  ): Promise<StructuredVenueRepositoryResult<DraftStructuredVenueProfile | null>> {
    const revision = await this.findDraftRevisionForVenue(client, venueId);
    if (!revision.ok) return fail(revision.error);
    if (!revision.data) return ok(null);

    const aggregate = await loadProfileAggregate(client, revision.data);
    if (!aggregate.ok) return aggregate;
    return ok({ revision: revision.data as DraftStructuredVenueProfile["revision"], ...aggregate.data });
  },

  async findPublishedProfileForVenue(
    client: StructuredVenueDataClient,
    venueId: string,
  ): Promise<StructuredVenueRepositoryResult<PublishedStructuredVenueProfile | null>> {
    const revision = await this.findPublishedRevisionForVenue(client, venueId);
    if (!revision.ok) return fail(revision.error);
    if (!revision.data) return ok(null);

    const aggregate = await loadProfileAggregate(client, revision.data);
    if (!aggregate.ok) return aggregate;
    return ok({
      revision: revision.data as PublishedStructuredVenueProfile["revision"],
      spaces: aggregate.data.spaces as PublishedStructuredVenueProfile["spaces"],
      mediaCollections:
        aggregate.data.mediaCollections as PublishedStructuredVenueProfile["mediaCollections"],
      mediaItems: aggregate.data.mediaItems as PublishedStructuredVenueProfile["mediaItems"],
      logistics: aggregate.data.logistics as PublishedStructuredVenueProfile["logistics"],
      faqs: aggregate.data.faqs as PublishedStructuredVenueProfile["faqs"],
      packageSpaces: aggregate.data.packageSpaces,
    });
  },
};

async function loadProfileAggregate(
  client: StructuredVenueDataClient,
  revision: VenueProfileRevision,
): Promise<
  StructuredVenueRepositoryResult<
    Omit<DraftStructuredVenueProfile, "revision">
  >
> {
  const spaces = await listRows(
    client
      .from<VenueSpaceRow[]>("venue_spaces")
      .select(spaceColumns)
      .eq("revision_id", revision.id)
      .eq("venue_id", revision.venueId)
      .order("display_order"),
  );
  if (!spaces.ok) return spaces;

  const collections = await listRows(
    client
      .from<MediaCollectionRow[]>("venue_media_collections")
      .select(mediaCollectionColumns)
      .eq("revision_id", revision.id)
      .eq("venue_id", revision.venueId)
      .order("display_order"),
  );
  if (!collections.ok) return collections;

  const collectionIds = collections.data.map((collection) => collection.id);
  const items = collectionIds.length
    ? await listRows(
        client
          .from<MediaItemRow[]>("venue_media_items")
          .select(mediaItemColumns)
          .eq("venue_id", revision.venueId)
          .in("collection_id", collectionIds)
          .order("display_order"),
      )
    : ok<MediaItemRow[]>([]);
  if (!items.ok) return items;

  const logistics = await client
    .from<LogisticsRow>("venue_logistics")
    .select(logisticsColumns)
    .eq("revision_id", revision.id)
    .eq("venue_id", revision.venueId)
    .maybeSingle();
  if (logistics.error) return fail(mapError(logistics.error));

  const faqs = await listRows(
    client
      .from<FaqRow[]>("venue_faqs")
      .select(faqColumns)
      .eq("revision_id", revision.id)
      .eq("venue_id", revision.venueId)
      .order("display_order"),
  );
  if (!faqs.ok) return faqs;

  const packageSpaces = await listRows(
    client
      .from<PackageVenueSpaceRow[]>("package_venue_spaces")
      .select(packageVenueSpaceColumns)
      .eq("venue_id", revision.venueId)
      .order("display_order"),
  );
  if (!packageSpaces.ok) return packageSpaces;

  return ok({
    spaces: spaces.data.map(mapSpace),
    mediaCollections: collections.data.map(mapMediaCollection),
    mediaItems: items.data.map(mapMediaItem),
    logistics: logistics.data ? mapLogistics(logistics.data) : null,
    faqs: faqs.data.map(mapFaq),
    packageSpaces: packageSpaces.data.map(mapPackageVenueSpace),
  });
}
