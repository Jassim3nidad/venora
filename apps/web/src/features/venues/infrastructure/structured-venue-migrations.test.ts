import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

function findRepoRoot(start: string): string {
  let current = start;

  while (current !== dirname(current)) {
    if (existsSync(join(current, "supabase", "migrations"))) {
      return current;
    }

    current = dirname(current);
  }

  throw new Error("Could not find repository root");
}

function readMigration(suffix: string): string {
  const repoRoot = findRepoRoot(process.cwd());
  const migrationDir = join(repoRoot, "supabase", "migrations");
  const migrationName = readdirSync(migrationDir).find((name) =>
    new RegExp(`^\\d+_${suffix}\\.sql$`).test(name),
  );

  if (!migrationName) {
    throw new Error(`Missing migration ending in ${suffix}.sql`);
  }

  return readFileSync(join(migrationDir, migrationName), "utf8")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

describe("structured venue core migration", () => {
  it("creates venue profile revisions with publication-state constraints", () => {
    const sql = readMigration("structured_venue_foundation_core");

    expect(sql).toContain("create table public.venue_profile_revisions");
    expect(sql).toContain("id uuid primary key default gen_random_uuid()");
    expect(sql).toContain(
      "venue_id uuid not null references public.venues(id) on delete cascade",
    );
    expect(sql).toContain("status text not null default 'draft'");
    expect(sql).toContain("revision_number integer not null default 1");
    expect(sql).toContain(
      "created_from_revision_id uuid references public.venue_profile_revisions(id) on delete set null",
    );
    expect(sql).toContain(
      "published_by uuid references public.profiles(id) on delete set null",
    );
    expect(sql).toContain("venue_profile_revisions_status_check");
    expect(sql).toContain("status in ('draft', 'published', 'archived')");
    expect(sql).toContain("venue_profile_revisions_revision_number_check");
    expect(sql).toContain("revision_number >= 1");
    expect(sql).toContain("venue_profile_revisions_published_at_check");
    expect(sql).toContain("status <> 'published' or published_at is not null");
    expect(sql).toContain("venue_profile_revisions_archived_at_check");
    expect(sql).toContain("status <> 'archived' or archived_at is not null");
  });

  it("enforces one active draft and one current published revision per venue", () => {
    const sql = readMigration("structured_venue_foundation_core");

    expect(sql).toContain(
      "constraint venue_profile_revisions_venue_revision_number_unique unique (venue_id, revision_number)",
    );
    expect(sql).toContain(
      "constraint venue_profile_revisions_id_venue_id_unique unique (id, venue_id)",
    );
    expect(sql).toContain(
      "create unique index venue_profile_revisions_one_draft_per_venue",
    );
    expect(sql).toContain("where status = 'draft'");
    expect(sql).toContain(
      "create unique index venue_profile_revisions_one_published_per_venue",
    );
    expect(sql).toContain("where status = 'published'");
    expect(sql).toContain(
      "create index idx_venue_profile_revisions_venue_status",
    );
  });

  it("creates venue spaces with bounded plain structured fields", () => {
    const sql = readMigration("structured_venue_foundation_core");

    expect(sql).toContain("create table public.venue_spaces");
    expect(sql).toContain(
      "revision_id uuid not null references public.venue_profile_revisions(id) on delete cascade",
    );
    expect(sql).toContain(
      "foreign key (revision_id, venue_id) references public.venue_profile_revisions(id, venue_id)",
    );
    expect(sql).toContain("space_key uuid not null default gen_random_uuid()");
    expect(sql).toContain("name text not null");
    expect(sql).toContain("slug text not null");
    expect(sql).toContain("space_type text");
    expect(sql).toContain("setting text not null");
    expect(sql).toContain("capacity_min integer");
    expect(sql).toContain("capacity_max integer not null");
    expect(sql).toContain("display_order integer not null default 0");
    expect(sql).toContain("status text not null default 'draft'");
    expect(sql).toContain("venue_spaces_name_check");
    expect(sql).toContain("length(btrim(name)) between 2 and 120");
    expect(sql).toContain("venue_spaces_slug_check");
    expect(sql).toContain("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'");
    expect(sql).toContain("venue_spaces_setting_check");
    expect(sql).toContain("setting in ('indoor', 'outdoor', 'mixed')");
    expect(sql).toContain("venue_spaces_capacity_check");
    expect(sql).toContain("capacity_max between 0 and 100000");
    expect(sql).toContain("coalesce(capacity_min, 0) <= capacity_max");
  });

  it("adds uniqueness, indexes, updated_at triggers, and RLS without broad writes", () => {
    const sql = readMigration("structured_venue_foundation_core");

    expect(sql).toContain(
      "constraint venue_spaces_revision_slug_unique unique (revision_id, slug)",
    );
    expect(sql).toContain(
      "constraint venue_spaces_revision_space_key_unique unique (revision_id, space_key)",
    );
    expect(sql).toContain(
      "constraint venue_spaces_id_venue_id_unique unique (id, venue_id)",
    );
    expect(sql).toContain(
      "constraint venue_spaces_id_revision_venue_unique unique (id, revision_id, venue_id)",
    );
    expect(sql).toContain("create index idx_venue_spaces_revision_order");
    expect(sql).toContain("create index idx_venue_spaces_venue_status");
    expect(sql).toContain("create index idx_venue_spaces_setting");
    expect(sql).toContain("create index idx_venue_spaces_capacity_max");
    expect(sql).toContain("create trigger venue_profile_revisions_updated_at");
    expect(sql).toContain("execute function public.set_updated_at()");
    expect(sql).toContain("create trigger venue_spaces_updated_at");
    expect(sql).toContain(
      "alter table public.venue_profile_revisions enable row level security",
    );
    expect(sql).toContain(
      "alter table public.venue_spaces enable row level security",
    );
    expect(sql).not.toContain("create policy");
    expect(sql).not.toContain("insert into public.venue_profile_revisions");
    expect(sql).not.toContain("insert into public.venue_spaces");
  });
});

describe("structured venue space relationship migration", () => {
  it("creates capacity layouts with bounded layout and capacity data", () => {
    const sql = readMigration("structured_venue_space_relationships");

    expect(sql).toContain("create table public.venue_space_capacity_layouts");
    expect(sql).toContain(
      "space_id uuid not null references public.venue_spaces(id) on delete cascade",
    );
    expect(sql).toContain("layout text not null");
    expect(sql).toContain("custom_layout_label text");
    expect(sql).toContain("capacity integer not null");
    expect(sql).toContain("display_order integer not null default 0");
    expect(sql).toContain("venue_space_capacity_layouts_layout_check");
    for (const layout of [
      "banquet",
      "theatre",
      "classroom",
      "cocktail",
      "u_shape",
      "boardroom",
      "standing",
      "ceremony",
      "custom",
    ]) {
      expect(sql).toContain(`'${layout}'`);
    }
    expect(sql).toContain("venue_space_capacity_layouts_capacity_check");
    expect(sql).toContain("capacity between 0 and 100000");
    expect(sql).toContain("venue_space_capacity_layouts_custom_label_check");
    expect(sql).toContain(
      "layout <> 'custom' and custom_layout_label is null",
    );
  });

  it("prevents duplicate standard and custom layout rows per space", () => {
    const sql = readMigration("structured_venue_space_relationships");

    expect(sql).toContain(
      "create unique index venue_space_capacity_layouts_standard_unique",
    );
    expect(sql).toContain("on public.venue_space_capacity_layouts (space_id, layout)");
    expect(sql).toContain("where layout <> 'custom'");
    expect(sql).toContain(
      "create unique index venue_space_capacity_layouts_custom_unique",
    );
    expect(sql).toContain(
      "on public.venue_space_capacity_layouts (space_id, lower(custom_layout_label))",
    );
    expect(sql).toContain("where layout = 'custom'");
  });

  it("creates space amenity and event-type taxonomy relationships", () => {
    const sql = readMigration("structured_venue_space_relationships");

    expect(sql).toContain("create table public.venue_space_amenities");
    expect(sql).toContain("primary key (space_id, amenity_id)");
    expect(sql).toContain(
      "space_id uuid not null references public.venue_spaces(id) on delete cascade",
    );
    expect(sql).toContain(
      "amenity_id uuid not null references public.amenities(id) on delete restrict",
    );
    expect(sql).toContain("create table public.venue_space_event_types");
    expect(sql).toContain("primary key (space_id, event_type_id)");
    expect(sql).toContain(
      "event_type_id uuid not null references public.event_types(id) on delete restrict",
    );
    expect(sql).toContain("venue_space_amenities_notes_check");
    expect(sql).toContain("venue_space_event_types_notes_check");
  });

  it("adds indexes, updated_at trigger, and RLS without broad writes", () => {
    const sql = readMigration("structured_venue_space_relationships");

    expect(sql).toContain("create index idx_venue_space_capacity_layouts_space");
    expect(sql).toContain(
      "create index idx_venue_space_capacity_layouts_layout_capacity",
    );
    expect(sql).toContain("create index idx_venue_space_amenities_amenity");
    expect(sql).toContain("create index idx_venue_space_event_types_event_type");
    expect(sql).toContain("create trigger venue_space_capacity_layouts_updated_at");
    expect(sql).toContain("execute function public.set_updated_at()");
    expect(sql).toContain(
      "alter table public.venue_space_capacity_layouts enable row level security",
    );
    expect(sql).toContain(
      "alter table public.venue_space_amenities enable row level security",
    );
    expect(sql).toContain(
      "alter table public.venue_space_event_types enable row level security",
    );
    expect(sql).not.toContain("create policy");
  });
});

describe("structured venue media migration", () => {
  it("creates media collections scoped to revisions and optional spaces", () => {
    const sql = readMigration("structured_venue_media");

    expect(sql).toContain("create table public.venue_media_collections");
    expect(sql).toContain(
      "revision_id uuid not null references public.venue_profile_revisions(id) on delete cascade",
    );
    expect(sql).toContain(
      "foreign key (revision_id, venue_id) references public.venue_profile_revisions(id, venue_id)",
    );
    expect(sql).toContain(
      "foreign key (space_id, revision_id, venue_id) references public.venue_spaces(id, revision_id, venue_id)",
    );
    expect(sql).toContain("collection_type text not null");
    expect(sql).toContain("is_cover boolean not null default false");
    expect(sql).toContain("venue_media_collections_collection_type_check");
    for (const collectionType of [
      "hero",
      "gallery",
      "space_gallery",
      "video",
      "logistics",
    ]) {
      expect(sql).toContain(`'${collectionType}'`);
    }
  });

  it("creates uploaded media items without external provider fields", () => {
    const sql = readMigration("structured_venue_media");

    expect(sql).toContain("create table public.venue_media_items");
    expect(sql).toContain(
      "collection_id uuid not null references public.venue_media_collections(id) on delete cascade",
    );
    expect(sql).toContain("storage_path text not null");
    expect(sql).toContain(
      "legacy_venue_image_id uuid references public.venue_images(id) on delete set null",
    );
    expect(sql).toContain("media_type text not null");
    expect(sql).toContain("alt_text text");
    expect(sql).toContain("transcript text");
    expect(sql).toContain("venue_media_items_media_type_check");
    expect(sql).toContain("media_type in ('image', 'video')");
    expect(sql).toContain("venue_media_items_mime_type_check");
    expect(sql).toContain("'image/jpeg'");
    expect(sql).toContain("'video/mp4'");
    expect(sql).not.toContain("external_url");
    expect(sql).not.toContain("external_provider");
  });

  it("adds uniqueness, indexes, triggers, and RLS for media tables", () => {
    const sql = readMigration("structured_venue_media");

    expect(sql).toContain(
      "constraint venue_media_collections_id_venue_id_unique unique (id, venue_id)",
    );
    expect(sql).toContain(
      "create unique index venue_media_collections_cover_unique",
    );
    expect(sql).toContain("where is_cover and status = 'published'");
    expect(sql).toContain("create unique index venue_media_items_legacy_unique");
    expect(sql).toContain("create unique index venue_media_items_featured_unique");
    expect(sql).toContain("create index idx_venue_media_collections_revision");
    expect(sql).toContain("create index idx_venue_media_items_collection");
    expect(sql).toContain("create trigger venue_media_collections_updated_at");
    expect(sql).toContain("create trigger venue_media_items_updated_at");
    expect(sql).toContain(
      "alter table public.venue_media_collections enable row level security",
    );
    expect(sql).toContain(
      "alter table public.venue_media_items enable row level security",
    );
    expect(sql).not.toContain("create policy");
  });
});

describe("structured venue logistics and FAQ migration", () => {
  it("creates one structured logistics record per venue revision", () => {
    const sql = readMigration("structured_venue_logistics_faqs");

    expect(sql).toContain("create table public.venue_logistics");
    expect(sql).toContain(
      "revision_id uuid not null references public.venue_profile_revisions(id) on delete cascade",
    );
    expect(sql).toContain(
      "foreign key (revision_id, venue_id) references public.venue_profile_revisions(id, venue_id)",
    );
    expect(sql).toContain("parking_summary text");
    expect(sql).toContain("parking_capacity integer");
    expect(sql).toContain("accessibility_summary text");
    expect(sql).toContain("catering_policy text");
    expect(sql).toContain("outside_supplier_policy text");
    expect(sql).toContain("alcohol_policy text");
    expect(sql).toContain("noise_policy text");
    expect(sql).toContain("curfew_time time");
    expect(sql).toContain("load_in_notes text");
    expect(sql).toContain("unique (revision_id)");
    expect(sql).toContain("venue_logistics_parking_capacity_check");
    expect(sql).toContain("parking_capacity is null or parking_capacity >= 0");
  });

  it("creates plain-text FAQs with categories and revision ordering", () => {
    const sql = readMigration("structured_venue_logistics_faqs");

    expect(sql).toContain("create table public.venue_faqs");
    expect(sql).toContain(
      "revision_id uuid not null references public.venue_profile_revisions(id) on delete cascade",
    );
    expect(sql).toContain("question text not null");
    expect(sql).toContain("answer text not null");
    expect(sql).toContain("category text");
    expect(sql).toContain("display_order integer not null default 0");
    expect(sql).toContain("venue_faqs_question_check");
    expect(sql).toContain("length(btrim(question)) between 5 and 200");
    expect(sql).toContain("venue_faqs_answer_check");
    expect(sql).toContain("length(btrim(answer)) between 5 and 2000");
    expect(sql).toContain("venue_faqs_plain_text_check");
    expect(sql).toContain("question !~ '<[[:alpha:]]'");
    expect(sql).toContain("answer !~ '<[[:alpha:]]'");
    expect(sql).toContain("create unique index venue_faqs_revision_question_unique");
  });

  it("adds indexes, triggers, and RLS without broad writes", () => {
    const sql = readMigration("structured_venue_logistics_faqs");

    expect(sql).toContain("create index idx_venue_logistics_venue");
    expect(sql).toContain("create index idx_venue_faqs_revision_order");
    expect(sql).toContain("create index idx_venue_faqs_category");
    expect(sql).toContain("create trigger venue_logistics_updated_at");
    expect(sql).toContain("create trigger venue_faqs_updated_at");
    expect(sql).toContain(
      "alter table public.venue_logistics enable row level security",
    );
    expect(sql).toContain(
      "alter table public.venue_faqs enable row level security",
    );
    expect(sql).not.toContain("create policy");
  });
});

describe("structured venue publication access migration", () => {
  it("adds public read policies only for published profile revisions and spaces", () => {
    const sql = readMigration("structured_venue_publication_access");

    expect(sql).toContain("create policy venue_profile_revisions_public_read");
    expect(sql).toContain(
      "grant select on public.venue_profile_revisions to anon, authenticated",
    );
    expect(sql).toContain(
      "grant select on public.venue_spaces to anon, authenticated",
    );
    expect(sql).toContain("on public.venue_profile_revisions");
    expect(sql).toContain("for select");
    expect(sql).toContain("to anon, authenticated");
    expect(sql).toContain("using (status = 'published')");
    expect(sql).toContain("create policy venue_spaces_public_read");
    expect(sql).toContain("on public.venue_spaces");
    expect(sql).toContain("venue_spaces.status = 'published'");
    expect(sql).toContain("published_revision.status = 'published'");
  });

  it("adds published-revision public reads for relationship and media tables", () => {
    const sql = readMigration("structured_venue_publication_access");

    for (const policy of [
      "venue_space_capacity_layouts_public_read",
      "venue_space_amenities_public_read",
      "venue_space_event_types_public_read",
      "venue_media_collections_public_read",
      "venue_media_items_public_read",
    ]) {
      expect(sql).toContain(`create policy ${policy}`);
    }
    expect(sql).toContain("published_space.status = 'published'");
    expect(sql).toContain("published_revision.status = 'published'");
    expect(sql).toContain("collection.status = 'published'");
    expect(sql).toContain("venue_media_items.status = 'published'");
    expect(sql).toContain("venue_media_items.deleted_at is null");
    expect(sql).toContain("venue_media_items.moderation_status = 'approved'");
    expect(sql).toContain(
      "grant select on public.venue_space_capacity_layouts to anon, authenticated",
    );
    expect(sql).toContain(
      "grant select on public.venue_media_items to anon, authenticated",
    );
  });

  it("adds published-revision public reads for logistics and FAQs without write access", () => {
    const sql = readMigration("structured_venue_publication_access");

    expect(sql).toContain("create policy venue_logistics_public_read");
    expect(sql).toContain("create policy venue_faqs_public_read");
    expect(sql).toContain("published_revision.status = 'published'");
    expect(sql).toContain("venue_logistics.status = 'published'");
    expect(sql).toContain("venue_faqs.status = 'published'");
    expect(sql).toContain(
      "grant select on public.venue_logistics to anon, authenticated",
    );
    expect(sql).toContain(
      "grant select on public.venue_faqs to anon, authenticated",
    );
    expect(sql).not.toContain("for insert");
    expect(sql).not.toContain("for update");
    expect(sql).not.toContain("for delete");
    expect(sql).not.toContain("using (true)");
  });
});

describe("package venue spaces migration", () => {
  it("adds composite package identity needed for same-venue space links", () => {
    const sql = readMigration("package_venue_spaces");

    expect(sql).toContain(
      "alter table public.venue_packages add constraint venue_packages_id_venue_id_unique unique (id, venue_id)",
    );
  });

  it("creates package-to-space links with same-venue integrity", () => {
    const sql = readMigration("package_venue_spaces");

    expect(sql).toContain("create table public.package_venue_spaces");
    expect(sql).toContain("package_id uuid not null");
    expect(sql).toContain("space_id uuid not null");
    expect(sql).toContain("venue_id uuid not null");
    expect(sql).toContain(
      "foreign key (package_id, venue_id) references public.venue_packages(id, venue_id)",
    );
    expect(sql).toContain(
      "foreign key (space_id, venue_id) references public.venue_spaces(id, venue_id)",
    );
    expect(sql).toContain("inclusion_type text not null default 'included'");
    expect(sql).toContain("inclusion_type in ('included', 'optional', 'upgrade')");
    expect(sql).toContain("inclusion_notes text");
    expect(sql).toContain("display_order integer not null default 0");
    expect(sql).toContain(
      "constraint package_venue_spaces_package_space_unique unique (package_id, space_id)",
    );
  });

  it("adds indexes, trigger, RLS, and published public read policy without writes", () => {
    const sql = readMigration("package_venue_spaces");

    expect(sql).toContain("create index idx_package_venue_spaces_package");
    expect(sql).toContain("create index idx_package_venue_spaces_space");
    expect(sql).toContain("create trigger package_venue_spaces_updated_at");
    expect(sql).toContain(
      "alter table public.package_venue_spaces enable row level security",
    );
    expect(sql).toContain("create policy package_venue_spaces_public_read");
    expect(sql).toContain(
      "grant select on public.venue_packages to anon, authenticated",
    );
    expect(sql).toContain(
      "grant select on public.package_venue_spaces to anon, authenticated",
    );
    expect(sql).toContain("for select");
    expect(sql).toContain("package.is_active is true");
    expect(sql).toContain("published_space.status = 'published'");
    expect(sql).toContain("published_revision.status = 'published'");
    expect(sql).not.toContain("for insert");
    expect(sql).not.toContain("for update");
    expect(sql).not.toContain("for delete");
  });
});

describe("structured venue write access migration", () => {
  it("adds scoped helper functions for owner, admin, and assigned coordinator access", () => {
    const sql = readMigration("structured_venue_write_access");

    expect(sql).toContain(
      "create or replace function public.can_manage_venue_structured_content",
    );
    expect(sql).toContain(
      "create or replace function public.can_preview_venue_structured_content",
    );
    expect(sql).toContain(
      "create or replace function public.can_publish_venue_structured_content",
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_catalog");
    expect(sql).toContain("public.is_admin()");
    expect(sql).toContain("public.is_org_owner(venue.organization_id)");
    expect(sql).toContain("join public.venue_coordinator_assignments assignment");
    expect(sql).toContain("member.role = 'coordinator'");
    expect(sql).toContain("member.status = 'active'");
    expect(sql).toContain(
      "'manage_assigned_venue_listings' = any(member.permissions)",
    );
    expect(sql).toContain("'view_assigned_venues' = any(member.permissions)");
    expect(sql).not.toContain("role = 'event_coordinator'");
  });

  it("keeps publication authority limited to owners and admins", () => {
    const sql = readMigration("structured_venue_write_access");
    const publishFunction = sql.slice(
      sql.indexOf(
        "create or replace function public.can_publish_venue_structured_content",
      ),
      sql.indexOf(
        "create or replace function public.structured_revision_allows_draft_write",
      ),
    );

    expect(publishFunction).toContain("public.is_admin()");
    expect(publishFunction).toContain(
      "public.is_org_owner(venue.organization_id)",
    );
    expect(publishFunction).not.toContain("organization_members");
    expect(publishFunction).not.toContain("venue_coordinator_assignments");
    expect(publishFunction).not.toContain("manage_assigned_venue_listings");
    expect(publishFunction).not.toContain("view_assigned_venues");
  });

  it("grants authenticated writes but requires RLS policies for every structured table", () => {
    const sql = readMigration("structured_venue_write_access");

    for (const table of [
      "venue_profile_revisions",
      "venue_spaces",
      "venue_space_capacity_layouts",
      "venue_space_amenities",
      "venue_space_event_types",
      "venue_media_collections",
      "venue_media_items",
      "venue_logistics",
      "venue_faqs",
      "package_venue_spaces",
    ]) {
      expect(sql).toContain(
        `grant insert, update, delete on public.${table} to authenticated`,
      );
      expect(sql).toContain(`on public.${table} for select`);
      expect(sql).toContain(`on public.${table} for insert`);
      expect(sql).toContain(`on public.${table} for update`);
      expect(sql).toContain(`on public.${table} for delete`);
    }
  });

  it("confines normal edits to draft structured content and checks media path ownership", () => {
    const sql = readMigration("structured_venue_write_access");

    expect(sql).toContain(
      "create or replace function public.structured_revision_allows_draft_write",
    );
    expect(sql).toContain(
      "create or replace function public.structured_space_allows_draft_write",
    );
    expect(sql).toContain(
      "create or replace function public.structured_media_path_belongs_to_venue",
    );
    expect(sql).toContain("revision.status = 'draft'");
    expect(sql).toContain("space.status = 'draft'");
    expect(sql).toContain(
      "p_storage_path like venue.organization_id::text || '/' || p_venue_id::text || '/%'",
    );
    expect(sql).toContain(
      "status = 'draft' and public.structured_media_collection_allows_draft_write(collection_id)",
    );
  });

  it("does not introduce broad bypass policies or anonymous writes", () => {
    const sql = readMigration("structured_venue_write_access");

    expect(sql).toContain("revoke all on function");
    expect(sql).toContain("grant execute on function");
    expect(sql).not.toContain("to anon");
    expect(sql).not.toContain("using (true)");
    expect(sql).not.toContain("with check (true)");
    expect(sql).not.toContain("disable row level security");
    expect(sql).not.toContain("service_role");
  });
});
