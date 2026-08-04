import { describe, expect, it } from "vitest";
import {
  structuredVenueProfileRepository,
  type StructuredVenueDataClient,
} from "./structured-profile-repository";

type MockError = { code?: string; message?: string };
type MockResponse<T = unknown> = { data: T | null; error: MockError | null };
type MockOperation = {
  name: string;
  args: unknown[];
};
type MockCall = {
  table: string;
  operations: MockOperation[];
};

class MockQuery<T = unknown> implements PromiseLike<MockResponse<T>> {
  readonly operations: MockOperation[] = [];

  constructor(
    private readonly client: MockStructuredVenueClient,
    readonly table: string,
  ) {}

  select(columns?: string) {
    this.operations.push({ name: "select", args: [columns] });
    return this;
  }

  insert(values: unknown) {
    this.operations.push({ name: "insert", args: [values] });
    return this;
  }

  update(values: unknown) {
    this.operations.push({ name: "update", args: [values] });
    return this;
  }

  upsert(values: unknown, options?: unknown) {
    this.operations.push({ name: "upsert", args: [values, options] });
    return this;
  }

  delete() {
    this.operations.push({ name: "delete", args: [] });
    return this;
  }

  eq(column: string, value: unknown) {
    this.operations.push({ name: "eq", args: [column, value] });
    return this;
  }

  in(column: string, values: readonly unknown[]) {
    this.operations.push({ name: "in", args: [column, values] });
    return this;
  }

  order(column: string, options?: { ascending?: boolean; referencedTable?: string }) {
    this.operations.push({ name: "order", args: [column, options] });
    return this;
  }

  limit(count: number) {
    this.operations.push({ name: "limit", args: [count] });
    return this;
  }

  maybeSingle() {
    this.operations.push({ name: "maybeSingle", args: [] });
    return this as unknown as PromiseLike<MockResponse<T | null>>;
  }

  single() {
    this.operations.push({ name: "single", args: [] });
    return this;
  }

  then<TResult1 = MockResponse<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: MockResponse<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.client.resolve<T>(this)).then(
      onfulfilled,
      onrejected,
    );
  }
}

class MockStructuredVenueClient implements StructuredVenueDataClient {
  readonly calls: MockCall[] = [];
  private readonly responses: MockResponse[];

  constructor(responses: MockResponse[]) {
    this.responses = [...responses];
  }

  from<T = unknown>(table: string) {
    return new MockQuery<T>(this, table);
  }

  resolve<T>(query: MockQuery<T>): MockResponse<T> {
    this.calls.push({
      table: query.table,
      operations: query.operations,
    });

    const response = this.responses.shift() ?? { data: null, error: null };
    return response as MockResponse<T>;
  }
}

const venueId = "758c437f-6a9c-434a-a5aa-e6290787bd7f";
const publishedRevision = {
  id: "df2ca83c-18a7-4f6d-b48f-3469ef3d37d1",
  venue_id: venueId,
  status: "published",
  revision_number: 2,
  created_from_revision_id: "87ec4e59-9b7c-4090-8452-c58fd26dc819",
  published_at: "2026-07-31T00:00:00.000Z",
  published_by: "a919d61a-36ac-42c9-99b7-74df1bd78fd4",
  archived_at: null,
  created_at: "2026-07-31T00:00:00.000Z",
  updated_at: "2026-07-31T00:00:00.000Z",
};

const publishedSpace = {
  id: "a52728aa-65f7-428f-8c78-0f050d65658b",
  revision_id: publishedRevision.id,
  venue_id: venueId,
  space_key: "f5ca8597-c9d4-4aa8-b793-f0dd521b6acd",
  name: "Garden Pavilion",
  slug: "garden-pavilion",
  space_type: "garden",
  setting: "outdoor",
  short_description: null,
  description: null,
  capacity_min: null,
  capacity_max: 150,
  accessibility_summary: null,
  restrictions: null,
  operating_notes: null,
  display_order: 0,
  status: "published",
  archived_at: null,
  created_at: "2026-07-31T00:00:00.000Z",
  updated_at: "2026-07-31T00:00:00.000Z",
};

describe("structured venue legacy compatibility", () => {
  it("returns null when an existing venue has no structured revision", async () => {
    const client = new MockStructuredVenueClient([{ data: null, error: null }]);

    const result = await structuredVenueProfileRepository.findPublishedProfileForVenue(
      client,
      venueId,
    );

    expect(result).toEqual({ ok: true, data: null });
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]?.table).toBe("venue_profile_revisions");
    expect(client.calls[0]?.operations).toEqual(
      expect.arrayContaining([
        { name: "eq", args: ["venue_id", venueId] },
        { name: "eq", args: ["status", "published"] },
      ]),
    );
    expect(client.calls[0]?.operations.some((operation) => operation.name === "insert")).toBe(
      false,
    );
  });

  it("does not disclose draft-only revisions through the public aggregate", async () => {
    const client = new MockStructuredVenueClient([{ data: null, error: null }]);

    const result = await structuredVenueProfileRepository.findPublishedProfileForVenue(
      client,
      venueId,
    );

    expect(result).toEqual({ ok: true, data: null });
    expect(client.calls[0]?.operations).toEqual(
      expect.arrayContaining([{ name: "eq", args: ["status", "published"] }]),
    );
    expect(JSON.stringify(result)).not.toContain("draft");
  });

  it("loads published structured content while keeping package and media fallbacks optional", async () => {
    const client = new MockStructuredVenueClient([
      { data: publishedRevision, error: null },
      { data: [publishedSpace], error: null },
      { data: [], error: null },
      { data: null, error: null },
      { data: [], error: null },
      { data: [], error: null },
    ]);

    const result = await structuredVenueProfileRepository.findPublishedProfileForVenue(
      client,
      venueId,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.revision.status).toBe("published");
      expect(result.data?.spaces).toHaveLength(1);
      expect(result.data?.mediaCollections).toEqual([]);
      expect(result.data?.mediaItems).toEqual([]);
      expect(result.data?.logistics).toBeNull();
      expect(result.data?.faqs).toEqual([]);
      expect(result.data?.packageSpaces).toEqual([]);
    }
    expect(client.calls.map((call) => call.table)).toEqual([
      "venue_profile_revisions",
      "venue_spaces",
      "venue_media_collections",
      "venue_logistics",
      "venue_faqs",
      "package_venue_spaces",
    ]);
  });

  it("does not treat archived revisions as the current public aggregate", async () => {
    const client = new MockStructuredVenueClient([{ data: null, error: null }]);

    const result = await structuredVenueProfileRepository.findPublishedRevisionForVenue(
      client,
      venueId,
    );

    expect(result).toEqual({ ok: true, data: null });
    expect(client.calls[0]?.operations).toEqual(
      expect.arrayContaining([{ name: "eq", args: ["status", "published"] }]),
    );
  });

  it("does not create drafts during public reads", async () => {
    const client = new MockStructuredVenueClient([{ data: null, error: null }]);

    await structuredVenueProfileRepository.findPublishedProfileForVenue(client, venueId);

    expect(
      client.calls.some((call) =>
        call.operations.some((operation) =>
          ["insert", "update", "upsert", "delete"].includes(operation.name),
        ),
      ),
    ).toBe(false);
  });

  it("returns sanitized repository errors for public aggregate failures", async () => {
    const client = new MockStructuredVenueClient([
      {
        data: null,
        error: {
          code: "42501",
          message: "permission denied for table venue_profile_revisions",
        },
      },
    ]);

    const result = await structuredVenueProfileRepository.findPublishedProfileForVenue(
      client,
      venueId,
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "forbidden",
        message: "You do not have permission to manage this venue profile.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("permission denied");
  });
});
