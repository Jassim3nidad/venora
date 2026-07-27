"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createServerAction } from "@/src/lib/server-action";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { absoluteUrl } from "@/src/lib/site-url";
import {
  resolveCoordinatorEmailFlow,
  type CoordinatorEmailFlow,
} from "@/src/features/staff/invitation-email-flow";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/errors";
import {
  DEFAULT_COORDINATOR_PERMISSIONS,
  isCoordinatorPermission,
  sanitizeCoordinatorPermissions,
} from "@/src/lib/rbac/coordinator-permissions";

const inviteCoordinatorSchema = z.object({
  organizationId: z.string().uuid(),
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  venueIds: z.array(z.string().uuid()).min(1, "Choose at least one venue."),
  permissions: z.array(z.string()).optional(),
});

const updateStaffStatusSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended", "revoked"]),
});

const revokeInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

const updateStaffVenueAssignmentsSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  venueIds: z.array(z.string().uuid()).min(1, "Choose at least one venue."),
});

const updateStaffPermissionsSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  permissions: z.array(z.string()),
});

async function requireOrganizationOwner(supabase: any, organizationId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("You must be signed in to manage staff.");
  }

  const [{ data: roleRows }, { data: organization }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  const isAdmin = (roleRows ?? []).some(
    (row: { role: string }) => row.role === "admin",
  );

  if (!organization && !isAdmin) {
    throw new ForbiddenError("Only organization owners can manage staff.");
  }

  return user;
}

async function assertVenuesBelongToOrganization(
  supabase: any,
  organizationId: string,
  venueIds: string[],
) {
  const uniqueVenueIds = [...new Set(venueIds)];

  const { data: venues, error } = await supabase
    .from("venues")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", uniqueVenueIds);

  if (error || (venues ?? []).length !== uniqueVenueIds.length) {
    throw new ValidationError("Choose venues owned by this organization.");
  }

  return uniqueVenueIds;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function findAuthUserByEmail(admin: any, email: string) {
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new ValidationError("Unable to check existing users.");
    }

    const match = data.users.find(
      (user: { email?: string | null }) => user.email?.toLowerCase() === email,
    );

    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function sendInvitationEmail({
  email,
  acceptUrl,
  flow,
}: {
  email: string;
  acceptUrl: string;
  flow: CoordinatorEmailFlow;
}): Promise<CoordinatorEmailFlow> {
  const sendMagicLink = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new ValidationError("Supabase email client is not configured.");
    }

    const authClient = createSupabaseJsClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await authClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: acceptUrl,
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw new ValidationError("Unable to send the coordinator email.");
    }

    return "magic_link" as const;
  };

  if (flow === "magic_link") {
    return sendMagicLink();
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: acceptUrl,
  });

  if (error) {
    return sendMagicLink();
  }

  return "invite";
}

function revalidateStaffViews() {
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/coordinator");
  revalidatePath("/dashboard/coordinator/venues");
  revalidatePath("/dashboard/coordinator/bookings");
  revalidatePath("/dashboard/coordinator/calendar");
  revalidatePath("/dashboard/coordinator/reports");
}

function parseCoordinatorPermissions(permissions: string[] | undefined) {
  if (permissions === undefined) {
    return [...DEFAULT_COORDINATOR_PERMISSIONS];
  }

  if (permissions.some((permission) => !isCoordinatorPermission(permission))) {
    throw new ValidationError("One or more permissions are invalid.");
  }

  return sanitizeCoordinatorPermissions(permissions, []);
}

function isAuthUsersPermissionError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("permission denied") && message.includes("table users")
  );
}

export async function inviteCoordinatorAction(rawInput: unknown) {
  return createServerAction(
    inviteCoordinatorSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const owner = await requireOrganizationOwner(
        supabase,
        input.organizationId,
      );
      const venueIds = await assertVenuesBelongToOrganization(
        supabase,
        input.organizationId,
        input.venueIds,
      );
      let existingUser: boolean | null = null;
      try {
        const admin = createAdminClient() as any;
        existingUser = Boolean(await findAuthUserByEmail(admin, input.email));
      } catch {
        existingUser = null;
      }
      const requestedFlow = resolveCoordinatorEmailFlow(existingUser);
      const token = randomBytes(32).toString("base64url");
      const tokenHash = hashToken(token);
      const acceptPath = `/staff/accept?token=${encodeURIComponent(token)}`;
      const acceptUrl = absoluteUrl(
        `/auth/session?next=${encodeURIComponent(acceptPath)}`,
      );

      const payload = {
        organization_id: input.organizationId,
        email: input.email,
        token_hash: tokenHash,
        role: "coordinator",
        status: "pending",
        venue_ids: venueIds,
        permissions: parseCoordinatorPermissions(input.permissions),
        invited_by: owner.id,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        accepted_by: null,
        accepted_at: null,
      };

      const { data: existingInvitation, error: selectError } = await supabase
        .from("organization_member_invitations")
        .select("id")
        .eq("organization_id", input.organizationId)
        .eq("email", input.email)
        .eq("status", "pending")
        .maybeSingle();

      if (selectError && !isAuthUsersPermissionError(selectError)) {
        throw new ValidationError(
          `Error fetching existing invitation: ${selectError.message}`,
        );
      }

      const writeResult =
        !selectError && existingInvitation
          ? await supabase
              .from("organization_member_invitations")
              .update({ ...payload, created_at: new Date().toISOString() })
              .eq("id", existingInvitation.id)
          : await supabase
              .from("organization_member_invitations")
              .insert(payload);

      if (writeResult.error) {
        if (
          isAuthUsersPermissionError(selectError) &&
          writeResult.error.code === "23505"
        ) {
          throw new ValidationError(
            "A pending invitation already exists for this email. Apply the latest coordinator invitation migration so existing invitations can be refreshed.",
          );
        }

        throw new ValidationError(
          `Unable to create the staff invitation: ${writeResult.error.message}`,
        );
      }

      let deliveredFlow: CoordinatorEmailFlow;
      try {
        deliveredFlow = await sendInvitationEmail({
          email: input.email,
          acceptUrl,
          flow: requestedFlow,
        });
      } catch (error) {
        await supabase
          .from("organization_member_invitations")
          .update({ status: "revoked" })
          .eq("token_hash", tokenHash);
        throw error;
      }

      revalidateStaffViews();
      return {
        email: input.email,
        flow: deliveredFlow,
      };
    },
    rawInput,
  );
}

export async function updateStaffStatusAction(rawInput: unknown) {
  return createServerAction(
    updateStaffStatusSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      await requireOrganizationOwner(supabase, input.organizationId);

      const timestamp =
        input.status === "active" ? null : new Date().toISOString();

      const { error } = await supabase
        .from("organization_members")
        .update({
          status: input.status,
          suspended_at: input.status === "suspended" ? timestamp : null,
          revoked_at: input.status === "revoked" ? timestamp : null,
        })
        .eq("organization_id", input.organizationId)
        .eq("user_id", input.userId);

      if (error) {
        throw new ValidationError("Unable to update this staff member.");
      }

      revalidateStaffViews();
      return { userId: input.userId, status: input.status };
    },
    rawInput,
  );
}

export async function updateStaffVenueAssignmentsAction(rawInput: unknown) {
  return createServerAction(
    updateStaffVenueAssignmentsSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const owner = await requireOrganizationOwner(
        supabase,
        input.organizationId,
      );
      const venueIds = await assertVenuesBelongToOrganization(
        supabase,
        input.organizationId,
        input.venueIds,
      );

      const { data: member } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", input.organizationId)
        .eq("user_id", input.userId)
        .eq("role", "coordinator")
        .eq("status", "active")
        .maybeSingle();

      if (!member) {
        throw new ValidationError("Only active coordinators can be assigned.");
      }

      const deleteResult = await supabase
        .from("venue_coordinator_assignments")
        .delete()
        .eq("organization_id", input.organizationId)
        .eq("user_id", input.userId);

      if (deleteResult.error) {
        throw new ValidationError("Unable to update venue assignments.");
      }

      const insertResult = await supabase
        .from("venue_coordinator_assignments")
        .insert(
          venueIds.map((venueId) => ({
            organization_id: input.organizationId,
            venue_id: venueId,
            user_id: input.userId,
            assigned_by: owner.id,
          })),
        );

      if (insertResult.error) {
        throw new ValidationError("Unable to save venue assignments.");
      }

      revalidateStaffViews();
      return { userId: input.userId, venueIds };
    },
    rawInput,
  );
}

export async function revokeInvitationAction(rawInput: unknown) {
  return createServerAction(
    revokeInvitationSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const { data: invitation } = await supabase
        .from("organization_member_invitations")
        .select("id, organization_id")
        .eq("id", input.invitationId)
        .maybeSingle();

      if (!invitation) {
        throw new ValidationError("Invitation not found.");
      }

      await requireOrganizationOwner(supabase, invitation.organization_id);

      const { error } = await supabase
        .from("organization_member_invitations")
        .update({ status: "revoked" })
        .eq("id", input.invitationId)
        .eq("status", "pending");

      if (error) {
        throw new ValidationError("Unable to revoke this invitation.");
      }

      revalidateStaffViews();
      return { invitationId: input.invitationId };
    },
    rawInput,
  );
}

export async function updateStaffPermissionsAction(rawInput: unknown) {
  return createServerAction(
    updateStaffPermissionsSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      await requireOrganizationOwner(supabase, input.organizationId);

      const permissions = parseCoordinatorPermissions(input.permissions);

      const { error } = await supabase
        .from("organization_members")
        .update({
          permissions,
        })
        .eq("organization_id", input.organizationId)
        .eq("user_id", input.userId)
        .eq("role", "coordinator")
        .eq("status", "active");

      if (error) {
        throw new ValidationError("Unable to update permissions.");
      }

      revalidateStaffViews();
      return { userId: input.userId, permissions };
    },
    rawInput,
  );
}
