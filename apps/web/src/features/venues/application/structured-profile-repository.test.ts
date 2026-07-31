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

const revisionRow = {
  id: "df2ca83c-18a7-4f6d-b48f-3469ef3d37d1",
  venue_id: "758c437f-6a9c-434a-a5aa-e6290787bd7f",
  status: "draft",
  revision_number: 3,
  created_from_revision_id: null,
  published_at: null,
  published_by: null,
  archived_at: null,
  created_at: "2026-07-31T00:00:00.000Z",
  updated_at: "2026-07-31T00:00:00.000Z",
};

describe("structured venue profile repository", () => {
  it("maps draft revision rows without exposing database field names", async () => {
    const client = new MockStructuredVenueClient([
      { data: revisionRow, error: null },
    ]);

    const result = await structuredVenueProfileRepository.findDraftRevisionForVenue(
      client,
      revisionRow.venue_id,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.venueId).toBe(revisionRow.venue_id);
      expect(result.data?.revisionNumber).toBe(3);
    }
    expect(client.calls[0]?.table).toBe("venue_profile_revisions");
    expect(client.calls[0]?.operations).toEqual(
      expect.arrayContaining([
        { name: "eq", args: ["venue_id", revisionRow.venue_id] },
        { name: "eq", args: ["status", "draft"] },
      ]),
    );
  });

  it("returns an existing draft without creating a duplicate revision", async () => {
    const client = new MockStructuredVenueClient([
      { data: revisionRow, error: null },
    ]);

    const result =
      await structuredVenueProfileRepository.getOrCreateDraftRevisionForVenue(
        client,
        revisionRow.venue_id,
      );

    expect(result.ok).toBe(true);
    expect(client.calls).toHaveLength(1);
    expect(
      client.calls.some((call) =>
        call.operations.some((operation) => operation.name === "insert"),
      ),
    ).toBe(false);
  });

  it("creates the next draft revision from the latest revision", async () => {
    const createdRow = {
      ...revisionRow,
      id: "f1a0c4da-9fed-4de8-a2f2-467315796a52",
      revision_number: 4,
      created_from_revision_id: revisionRow.id,
    };
    const client = new MockStructuredVenueClient([
      { data: null, error: null },
      { data: revisionRow, error: null },
      { data: createdRow, error: null },
    ]);

    const result =
      await structuredVenueProfileRepository.getOrCreateDraftRevisionForVenue(
        client,
        revisionRow.venue_id,
      );

    expect(result.ok).toBe(true);
    const insertCall = client.calls.find((call) =>
      call.operations.some((operation) => operation.name === "insert"),
    );
    const insertOperation = insertCall?.operations.find(
      (operation) => operation.name === "insert",
    );
    expect(insertOperation?.args[0]).toMatchObject({
      venue_id: revisionRow.venue_id,
      status: "draft",
      revision_number: 4,
      created_from_revision_id: revisionRow.id,
    });
  });

  it("publishes draft content without broadening media updates across revisions", async () => {
    const publishedRow = {
      ...revisionRow,
      status: "published",
      published_at: "2026-07-31T00:00:00.000Z",
      published_by: "3f0b0b2f-3529-45e0-a9a2-245f683d8c51",
    };
    const collectionRow = {
      id: "4f0a9a5f-709d-471d-9586-15d211de8d24",
      revision_id: revisionRow.id,
      venue_id: revisionRow.venue_id,
      space_id: null,
      collection_type: "hero",
      title: "Hero",
      description: null,
      display_order: 0,
      is_cover: true,
      status: "published",
      created_at: "2026-07-31T00:00:00.000Z",
      updated_at: "2026-07-31T00:00:00.000Z",
    };
    const client = new MockStructuredVenueClient([
      { data: null, error: null },
      { data: publishedRow, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: [collectionRow], error: null },
      { data: null, error: null },
      { data: null, error: null },
    ]);

    const result = await structuredVenueProfileRepository.publishDraftRevisionForVenue(
      client,
      {
        venueId: revisionRow.venue_id,
        revisionId: revisionRow.id,
        publishedBy: publishedRow.published_by,
      },
    );

    expect(result.ok).toBe(true);
    const mediaUpdate = client.calls.find(
      (call) =>
        call.table === "venue_media_items" &&
        call.operations.some((operation) => operation.name === "update"),
    );
    expect(mediaUpdate?.operations).toEqual(
      expect.arrayContaining([
        { name: "eq", args: ["venue_id", revisionRow.venue_id] },
        { name: "in", args: ["collection_id", [collectionRow.id]] },
      ]),
    );
  });

  it("sanitizes forbidden database errors", async () => {
    const client = new MockStructuredVenueClient([
      {
        data: null,
        error: {
          code: "42501",
          message: "permission denied for table users",
        },
      },
    ]);

    const result = await structuredVenueProfileRepository.findDraftRevisionForVenue(
      client,
      revisionRow.venue_id,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("forbidden");
      expect(result.error.message).not.toContain("users");
    }
  });

  it("replaces package-space links with same-venue payloads", async () => {
    const client = new MockStructuredVenueClient([
      { data: null, error: null },
      {
        data: [
          {
            id: "65b8c7c5-1c64-44f5-8f40-7bfde6c121c7",
            package_id: "1f6b693e-a6b6-4b7f-a9bd-5f45909e3db0",
            space_id: "8d191e6e-b5d9-46c7-bd31-a95b7fb5f32a",
            venue_id: revisionRow.venue_id,
            inclusion_type: "included",
            inclusion_notes: null,
            display_order: 0,
            created_at: "2026-07-31T00:00:00.000Z",
            updated_at: "2026-07-31T00:00:00.000Z",
          },
        ],
        error: null,
      },
    ]);

    const result =
      await structuredVenueProfileRepository.replacePackageVenueSpaces(client, {
        venueId: revisionRow.venue_id,
        packageId: "1f6b693e-a6b6-4b7f-a9bd-5f45909e3db0",
        spaces: [
          {
            spaceId: "8d191e6e-b5d9-46c7-bd31-a95b7fb5f32a",
            inclusionType: "included",
            displayOrder: 0,
          },
        ],
      });

    expect(result.ok).toBe(true);
    expect(client.calls[0]?.operations).toEqual(
      expect.arrayContaining([
        { name: "delete", args: [] },
        {
          name: "eq",
          args: ["package_id", "1f6b693e-a6b6-4b7f-a9bd-5f45909e3db0"],
        },
        { name: "eq", args: ["venue_id", revisionRow.venue_id] },
      ]),
    );
    const insertOperation = client.calls[1]?.operations.find(
      (operation) => operation.name === "insert",
    );
    expect(insertOperation?.args[0]).toEqual([
      expect.objectContaining({
        venue_id: revisionRow.venue_id,
        package_id: "1f6b693e-a6b6-4b7f-a9bd-5f45909e3db0",
        space_id: "8d191e6e-b5d9-46c7-bd31-a95b7fb5f32a",
      }),
    ]);
  });
});
