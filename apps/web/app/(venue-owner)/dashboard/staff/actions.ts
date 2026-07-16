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
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/errors";

const inviteCoordinatorSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
});

const updateStaffStatusSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended", "revoked"]),
});

const revokeInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

async function requireOrganizationOwner(
  supabase: any,
  organizationId: string,
) {
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
      (user: { email?: string | null }) =>
        user.email?.toLowerCase() === email,
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
  existingUser,
}: {
  email: string;
  acceptUrl: string;
  existingUser: boolean;
}) {
  if (existingUser) {
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
        shouldCreateUser: false,
      },
    });

    if (error) {
      throw new ValidationError("Unable to send the coordinator email.");
    }

    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: acceptUrl,
  });

  if (error) {
    throw new ValidationError("Unable to send the coordinator invitation.");
  }
}

function revalidateStaffViews() {
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/coordinator");
  revalidatePath("/dashboard/coordinator/venues");
  revalidatePath("/dashboard/coordinator/events");
  revalidatePath("/dashboard/coordinator/calendar");
  revalidatePath("/dashboard/coordinator/reports");
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
      const admin = createAdminClient() as any;
      const existingUser = await findAuthUserByEmail(admin, input.email);
      const token = randomBytes(32).toString("base64url");
      const tokenHash = hashToken(token);
      const acceptPath = `/staff/accept?token=${encodeURIComponent(token)}`;
      const acceptUrl = absoluteUrl(
        `/auth/callback?next=${encodeURIComponent(acceptPath)}`,
      );

      const { data: existingInvitation } = await admin
        .from("organization_member_invitations")
        .select("id")
        .eq("organization_id", input.organizationId)
        .eq("email", input.email)
        .eq("status", "pending")
        .maybeSingle();

      const payload = {
        organization_id: input.organizationId,
        email: input.email,
        token_hash: tokenHash,
        role: "coordinator",
        status: "pending",
        invited_by: owner.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        accepted_by: null,
        accepted_at: null,
      };

      const writeResult = existingInvitation
        ? await admin
            .from("organization_member_invitations")
            .update(payload)
            .eq("id", existingInvitation.id)
        : await admin.from("organization_member_invitations").insert(payload);

      if (writeResult.error) {
        throw new ValidationError("Unable to create the staff invitation.");
      }

      try {
        await sendInvitationEmail({
          email: input.email,
          acceptUrl,
          existingUser: !!existingUser,
        });
      } catch (error) {
        await admin
          .from("organization_member_invitations")
          .update({ status: "revoked" })
          .eq("token_hash", tokenHash);
        throw error;
      }

      revalidateStaffViews();
      return {
        email: input.email,
        flow: existingUser ? "magic_link" : "invite",
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
