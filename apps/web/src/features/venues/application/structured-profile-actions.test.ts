import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createVenueSpaceAction,
  publishStructuredVenueProfileAction,
} from "./structured-profile-actions";
import { structuredVenueProfileRepository } from "./structured-profile-repository";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("./structured-profile-repository", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./structured-profile-repository")>();

  return {
    ...actual,
    structuredVenueProfileRepository: {
      getOrCreateDraftRevisionForVenue: vi.fn(),
      discardDraftRevisionForVenue: vi.fn(),
      publishDraftRevisionForVenue: vi.fn(),
      createVenueSpace: vi.fn(),
      updateVenueSpace: vi.fn(),
      reorderVenueSpaces: vi.fn(),
      archiveVenueSpace: vi.fn(),
      replaceCapacityLayouts: vi.fn(),
      replaceSpaceAmenities: vi.fn(),
      replaceSpaceEventTypes: vi.fn(),
      upsertMediaCollection: vi.fn(),
      upsertMediaItem: vi.fn(),
      upsertVenueLogistics: vi.fn(),
      createVenueFaq: vi.fn(),
      replacePackageVenueSpaces: vi.fn(),
    },
  };
});

type MockRole = {
  role: string;
};

type MockUser = {
  id: string;
};

const venueId = "758c437f-6a9c-434a-a5aa-e6290787bd7f";
const revisionId = "df2ca83c-18a7-4f6d-b48f-3469ef3d37d1";
const spaceId = "8d191e6e-b5d9-46c7-bd31-a95b7fb5f32a";
const ownerUser = { id: "3f0b0b2f-3529-45e0-a9a2-245f683d8c51" };

function createQueryResponse<T>(response: { data: T | null; error: unknown | null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(response)),
    then: (
      onfulfilled?: ((value: typeof response) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) => Promise.resolve(response).then(onfulfilled, onrejected),
  };

  return query;
}

function mockSupabase(args: {
  user: MockUser | null;
  roles: MockRole[];
  slug?: string | null;
}) {
  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: args.user },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "user_roles") {
        return createQueryResponse({ data: args.roles, error: null });
      }

      if (table === "venues") {
        return createQueryResponse({
          data: { slug: args.slug ?? "amorita-resort" },
          error: null,
        });
      }

      return createQueryResponse({ data: null, error: null });
    }),
  };

  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return supabase;
}

const validSpaceInput = {
  venueId,
  revisionId,
  name: "Grand Ballroom",
  slug: "grand-ballroom",
  spaceType: "ballroom",
  setting: "indoor",
  shortDescription: "A formal space for receptions.",
  description: "A flexible ballroom for seated or standing events.",
  capacityMin: 50,
  capacityMax: 300,
  accessibilitySummary: "Step-free entrance available.",
  restrictions: null,
  operatingNotes: null,
  displayOrder: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("structured venue profile actions", () => {
  it("requires an authenticated user before calling the repository", async () => {
    mockSupabase({ user: null, roles: [] });

    const result = await createVenueSpaceAction(validSpaceInput);

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("UNAUTHORIZED");
    expect(structuredVenueProfileRepository.createVenueSpace).not.toHaveBeenCalled();
  });

  it("denies coordinator publishing before repository write calls", async () => {
    mockSupabase({
      user: ownerUser,
      roles: [{ role: "event_coordinator" }],
    });

    const result = await publishStructuredVenueProfileAction({
      venueId,
      revisionId,
    });

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("FORBIDDEN");
    expect(result.error?.message).toContain("Only venue owners and admins");
    expect(
      structuredVenueProfileRepository.publishDraftRevisionForVenue,
    ).not.toHaveBeenCalled();
  });

  it("creates draft spaces through the repository and revalidates venue routes", async () => {
    mockSupabase({
      user: ownerUser,
      roles: [{ role: "venue_owner" }],
      slug: "amorita-resort",
    });
    vi.mocked(structuredVenueProfileRepository.createVenueSpace).mockResolvedValue({
      ok: true,
      data: {
        id: spaceId,
        revisionId,
        venueId,
        spaceKey: "b318d289-e785-4af4-bf5c-36d755746c08",
        name: "Grand Ballroom",
        slug: "grand-ballroom",
        spaceType: "ballroom",
        setting: "indoor",
        shortDescription: "A formal space for receptions.",
        description: "A flexible ballroom for seated or standing events.",
        capacityMin: 50,
        capacityMax: 300,
        accessibilitySummary: "Step-free entrance available.",
        restrictions: null,
        operatingNotes: null,
        displayOrder: 0,
        status: "draft",
        archivedAt: null,
        createdAt: "2026-07-31T00:00:00.000Z",
        updatedAt: "2026-07-31T00:00:00.000Z",
      },
    });

    const result = await createVenueSpaceAction(validSpaceInput);

    expect(result.error).toBeNull();
    expect(structuredVenueProfileRepository.createVenueSpace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ venueId, revisionId, name: "Grand Ballroom" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/venues");
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/venues/${venueId}`);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/coordinator/venues");
    expect(revalidatePath).toHaveBeenCalledWith("/venues");
    expect(revalidatePath).toHaveBeenCalledWith("/venues/amorita-resort");
    expect(revalidatePath).toHaveBeenCalledWith("/venues/amorita-resort/book");
  });

  it("returns safe errors when RLS blocks repository writes", async () => {
    mockSupabase({
      user: ownerUser,
      roles: [{ role: "venue_owner" }],
    });
    vi.mocked(structuredVenueProfileRepository.createVenueSpace).mockResolvedValue({
      ok: false,
      error: {
        code: "forbidden",
        message: "You do not have permission to manage this venue profile.",
      },
    });

    const result = await createVenueSpaceAction(validSpaceInput);

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("FORBIDDEN");
    expect(result.error?.message).not.toContain("permission denied for table");
  });

  it("validates structured schema input before repository writes", async () => {
    mockSupabase({
      user: ownerUser,
      roles: [{ role: "venue_owner" }],
    });

    const result = await createVenueSpaceAction({
      ...validSpaceInput,
      slug: "Grand Ballroom",
    });

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("VALIDATION_ERROR");
    expect(structuredVenueProfileRepository.createVenueSpace).not.toHaveBeenCalled();
  });
});
