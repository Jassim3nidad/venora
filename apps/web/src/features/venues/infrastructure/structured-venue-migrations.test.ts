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
