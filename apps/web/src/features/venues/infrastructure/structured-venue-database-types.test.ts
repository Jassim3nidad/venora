import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Tables, TablesInsert, TablesUpdate } from "@venora/database";

const generatedTypesPath = fileURLToPath(
  new URL("../../../../../../packages/database/types/generated.ts", import.meta.url),
);
const generatedTypes = readFileSync(generatedTypesPath, "utf8");

const structuredTables = {
  venue_profile_revisions: [
    "venue_id",
    "status",
    "revision_number",
    "created_from_revision_id",
    "published_at",
    "published_by",
    "archived_at",
  ],
  venue_spaces: [
    "revision_id",
    "venue_id",
    "space_key",
    "name",
    "slug",
    "space_type",
    "setting",
    "capacity_min",
    "capacity_max",
    "status",
  ],
  venue_space_capacity_layouts: [
    "space_id",
    "layout",
    "custom_layout_label",
    "capacity",
  ],
  venue_space_amenities: ["space_id", "amenity_id", "notes"],
  venue_space_event_types: ["space_id", "event_type_id", "notes"],
  venue_media_collections: [
    "revision_id",
    "venue_id",
    "space_id",
    "collection_type",
    "is_cover",
    "status",
  ],
  venue_media_items: [
    "collection_id",
    "venue_id",
    "storage_path",
    "legacy_venue_image_id",
    "media_type",
    "mime_type",
    "moderation_status",
    "deleted_at",
  ],
  venue_logistics: [
    "revision_id",
    "venue_id",
    "parking_summary",
    "parking_capacity",
    "curfew_time",
    "weather_contingency",
    "status",
  ],
  venue_faqs: ["revision_id", "venue_id", "question", "answer", "category", "status"],
  package_venue_spaces: [
    "package_id",
    "space_id",
    "venue_id",
    "inclusion_type",
    "inclusion_notes",
  ],
} as const;

function tableBlock(table: keyof typeof structuredTables) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return generatedTypes.match(new RegExp(`${escaped}:\\s*\\{[\\s\\S]*?\\n\\s{6}\\};`))?.[0];
}

describe("structured venue generated database types", () => {
  it("includes Row, Insert, and Update blocks for every structured table", () => {
    for (const [table, fields] of Object.entries(structuredTables)) {
      const block = tableBlock(table as keyof typeof structuredTables);

      expect(block, `${table} type block`).toBeTruthy();
      expect(block).toContain("Row:");
      expect(block).toContain("Insert:");
      expect(block).toContain("Update:");
      for (const field of fields) {
        expect(block).toContain(`${field}:`);
      }
    }
  });

  it("models database defaults as optional insert fields", () => {
    const revision: TablesInsert<"venue_profile_revisions"> = {
      venue_id: "758c437f-6a9c-434a-a5aa-e6290787bd7f",
    };
    const space: TablesInsert<"venue_spaces"> = {
      revision_id: "df2ca83c-18a7-4f6d-b48f-3469ef3d37d1",
      venue_id: revision.venue_id,
      name: "Garden Pavilion",
      slug: "garden-pavilion",
      setting: "outdoor",
      capacity_max: 150,
    };
    const mediaItem: TablesInsert<"venue_media_items"> = {
      collection_id: "d3f3c405-8d55-48ec-8532-e7567054f91e",
      venue_id: revision.venue_id,
      storage_path:
        "3d7d40de-0fe2-4497-831f-d0d9940c7636/758c437f-6a9c-434a-a5aa-e6290787bd7f/hero.webp",
      media_type: "image",
    };

    expect(revision.status).toBeUndefined();
    expect(space.display_order).toBeUndefined();
    expect(mediaItem.moderation_status).toBeUndefined();
  });

  it("keeps structured status and controlled values narrow", () => {
    expectTypeOf<Tables<"venue_profile_revisions">["status"]>().toEqualTypeOf<
      "draft" | "published" | "archived"
    >();
    expectTypeOf<Tables<"venue_spaces">["setting"]>().toEqualTypeOf<
      "indoor" | "outdoor" | "mixed"
    >();
    expectTypeOf<Tables<"venue_media_items">["media_type"]>().toEqualTypeOf<
      "image" | "video"
    >();
    expectTypeOf<Tables<"package_venue_spaces">["inclusion_type"]>().toEqualTypeOf<
      "included" | "optional" | "upgrade"
    >();
  });

  it("allows partial update payloads without immutable required fields", () => {
    const spaceUpdate: TablesUpdate<"venue_spaces"> = {
      name: "Updated Garden Pavilion",
      capacity_max: 180,
    };
    const packageSpaceUpdate: TablesUpdate<"package_venue_spaces"> = {
      inclusion_type: "upgrade",
    };

    expect(spaceUpdate.name).toBe("Updated Garden Pavilion");
    expect(packageSpaceUpdate.inclusion_type).toBe("upgrade");
  });
});
