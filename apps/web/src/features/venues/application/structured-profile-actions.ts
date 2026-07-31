"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/lib/errors";
import { createServerAction } from "@/src/lib/server-action";
import {
  archiveStructuredVenueRevisionSchema,
  capacityLayoutsSchema,
  createVenueSpaceSchema,
  mediaCollectionSchema,
  mediaItemSchema,
  packageVenueSpacesSchema,
  publishStructuredVenueProfileSchema,
  reorderVenueSpacesSchema,
  spaceAmenitiesSchema,
  spaceEventTypesSchema,
  updateVenueSpaceSchema,
  venueFaqSchema,
  venueLogisticsSchema,
} from "../schemas/structured-venue.schema";
import {
  structuredVenueProfileRepository,
  type StructuredVenueDataClient,
  type StructuredVenueRepositoryError,
  type StructuredVenueRepositoryResult,
} from "./structured-profile-repository";

type AuthenticatedUser = {
  id: string;
};

type StructuredVenueServerClient = StructuredVenueDataClient & {
  auth: {
    getUser(): Promise<{
      data: { user: AuthenticatedUser | null };
      error: unknown | null;
    }>;
  };
};

type RoleRow = {
  role: string;
};

type VenueSlugRow = {
  slug: string | null;
};

const venueScopeSchema = z.object({ venueId: z.string().uuid() }).strict();
const archiveVenueSpaceActionSchema = z
  .object({
    venueId: z.string().uuid(),
    revisionId: z.string().uuid(),
    spaceId: z.string().uuid(),
  })
  .strict();

async function createStructuredVenueClient() {
  return (await createClient()) as unknown as StructuredVenueServerClient;
}

async function requireStructuredVenueMutationUser(): Promise<{
  supabase: StructuredVenueServerClient;
  user: AuthenticatedUser;
  roles: string[];
}> {
  const supabase = await createStructuredVenueClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("Please sign in to manage venue profile content.");
  }

  const { data: roleRows, error } = await supabase
    .from<RoleRow[]>("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    throw new ForbiddenError("Unable to verify your venue profile permissions.");
  }

  const roles = (roleRows ?? []).map((row) => row.role);
  const hasStructuredVenueRole =
    roles.includes("admin") ||
    roles.includes("venue_owner") ||
    roles.includes("event_coordinator");

  if (!hasStructuredVenueRole) {
    throw new ForbiddenError(
      "Only venue owners, admins, or assigned coordinators can manage venue profile content.",
    );
  }

  return { supabase, user, roles };
}

async function requireStructuredVenuePublisher() {
  const context = await requireStructuredVenueMutationUser();
  const canPublish =
    context.roles.includes("admin") || context.roles.includes("venue_owner");

  if (!canPublish) {
    throw new ForbiddenError(
      "Only venue owners and admins can publish venue profile changes.",
    );
  }

  return context;
}

function throwRepositoryError(error: StructuredVenueRepositoryError): never {
  if (error.code === "not_found") {
    throw new NotFoundError("Venue profile content");
  }

  if (error.code === "forbidden") {
    throw new ForbiddenError(error.message);
  }

  if (error.code === "conflict") {
    throw new ConflictError(error.message);
  }

  throw new Error(error.message);
}

function unwrapRepositoryResult<T>(
  result: StructuredVenueRepositoryResult<T>,
): T {
  if (!result.ok) {
    throwRepositoryError(result.error);
  }

  return result.data;
}

async function revalidateStructuredVenuePaths(
  supabase: StructuredVenueServerClient,
  venueId: string,
) {
  revalidatePath("/dashboard/venues");
  revalidatePath(`/dashboard/venues/${venueId}`);
  revalidatePath("/dashboard/coordinator/venues");
  revalidatePath("/venues");

  const { data } = await supabase
    .from<VenueSlugRow>("venues")
    .select("slug")
    .eq("id", venueId)
    .maybeSingle();

  if (data?.slug) {
    revalidatePath(`/venues/${data.slug}`);
    revalidatePath(`/venues/${data.slug}/book`);
  }
}

export async function getOrCreateDraftStructuredVenueProfileAction(
  rawInput: unknown,
) {
  return createServerAction(
    venueScopeSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const draft =
        await structuredVenueProfileRepository.getOrCreateDraftRevisionForVenue(
          supabase,
          input.venueId,
        );
      const data = unwrapRepositoryResult(draft);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function discardDraftStructuredVenueProfileAction(rawInput: unknown) {
  return createServerAction(
    archiveStructuredVenueRevisionSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const archived =
        await structuredVenueProfileRepository.discardDraftRevisionForVenue(
          supabase,
          input,
        );
      const data = unwrapRepositoryResult(archived);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function publishStructuredVenueProfileAction(rawInput: unknown) {
  return createServerAction(
    publishStructuredVenueProfileSchema,
    async (input) => {
      const { supabase, user } = await requireStructuredVenuePublisher();
      const published =
        await structuredVenueProfileRepository.publishDraftRevisionForVenue(
          supabase,
          {
            venueId: input.venueId,
            revisionId: input.revisionId,
            publishedBy: user.id,
          },
        );
      const data = unwrapRepositoryResult(published);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function createVenueSpaceAction(rawInput: unknown) {
  return createServerAction(
    createVenueSpaceSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const created = await structuredVenueProfileRepository.createVenueSpace(
        supabase,
        input,
      );
      const data = unwrapRepositoryResult(created);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function updateVenueSpaceAction(rawInput: unknown) {
  return createServerAction(
    updateVenueSpaceSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const updated = await structuredVenueProfileRepository.updateVenueSpace(
        supabase,
        input,
      );
      const data = unwrapRepositoryResult(updated);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function reorderVenueSpacesAction(rawInput: unknown) {
  return createServerAction(
    reorderVenueSpacesSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const reordered = await structuredVenueProfileRepository.reorderVenueSpaces(
        supabase,
        input,
      );
      const data = unwrapRepositoryResult(reordered);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function archiveVenueSpaceAction(rawInput: unknown) {
  return createServerAction(
    archiveVenueSpaceActionSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const archived = await structuredVenueProfileRepository.archiveVenueSpace(
        supabase,
        input,
      );
      const data = unwrapRepositoryResult(archived);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function replaceCapacityLayoutsAction(rawInput: unknown) {
  return createServerAction(
    capacityLayoutsSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const layouts =
        await structuredVenueProfileRepository.replaceCapacityLayouts(
          supabase,
          input,
        );
      const data = unwrapRepositoryResult(layouts);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function replaceSpaceAmenitiesAction(rawInput: unknown) {
  return createServerAction(
    spaceAmenitiesSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const amenities =
        await structuredVenueProfileRepository.replaceSpaceAmenities(
          supabase,
          input,
        );
      const data = unwrapRepositoryResult(amenities);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function replaceSpaceEventTypesAction(rawInput: unknown) {
  return createServerAction(
    spaceEventTypesSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const eventTypes =
        await structuredVenueProfileRepository.replaceSpaceEventTypes(
          supabase,
          input,
        );
      const data = unwrapRepositoryResult(eventTypes);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function saveVenueMediaCollectionAction(rawInput: unknown) {
  return createServerAction(
    mediaCollectionSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const collection =
        await structuredVenueProfileRepository.upsertMediaCollection(
          supabase,
          input,
        );
      const data = unwrapRepositoryResult(collection);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function saveVenueMediaItemAction(rawInput: unknown) {
  return createServerAction(
    mediaItemSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const item = await structuredVenueProfileRepository.upsertMediaItem(
        supabase,
        input,
      );
      const data = unwrapRepositoryResult(item);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function saveVenueLogisticsAction(rawInput: unknown) {
  return createServerAction(
    venueLogisticsSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const logistics =
        await structuredVenueProfileRepository.upsertVenueLogistics(
          supabase,
          input,
        );
      const data = unwrapRepositoryResult(logistics);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function createVenueFaqAction(rawInput: unknown) {
  return createServerAction(
    venueFaqSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const faq = await structuredVenueProfileRepository.createVenueFaq(
        supabase,
        input,
      );
      const data = unwrapRepositoryResult(faq);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}

export async function replacePackageVenueSpacesAction(rawInput: unknown) {
  return createServerAction(
    packageVenueSpacesSchema,
    async (input) => {
      const { supabase } = await requireStructuredVenueMutationUser();
      const packageSpaces =
        await structuredVenueProfileRepository.replacePackageVenueSpaces(
          supabase,
          input,
        );
      const data = unwrapRepositoryResult(packageSpaces);
      await revalidateStructuredVenuePaths(supabase, input.venueId);
      return data;
    },
    rawInput,
  );
}
