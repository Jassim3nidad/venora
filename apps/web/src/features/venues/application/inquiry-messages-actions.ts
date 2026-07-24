"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/errors";
import { isAdminUser } from "@/src/lib/rbac/guards";
import { insertNotificationsForUsers } from "@/src/features/notifications/application/insert-notifications";

const sendVenueInquiryMessageSchema = z.object({
  inquiryId: z.string().uuid(),
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must not exceed 2000 characters"),
});

export type VenueInquiryMessage = {
  id: string;
  inquiry_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_name?: string | null;
};

type VenueInquiryAccess = {
  inquiry: {
    id: string;
    venue_id: string;
    customer_id: string;
    status: string;
    organization_id: string | null;
    venue_org_owner_id: string | null;
  };
  role: "customer" | "venue_team";
};

async function assertVenueInquiryAccess(
  supabase: any,
  inquiryId: string,
  userId: string,
): Promise<VenueInquiryAccess> {
  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .select(
      `
      id,
      venue_id,
      customer_id,
      status,
      venues (
        organization_id,
        organizations:organization_id (
          owner_id
        )
      )
    `,
    )
    .eq("id", inquiryId)
    .maybeSingle();

  if (error) throw new ValidationError("Failed to load inquiry.");
  if (!inquiry) throw new NotFoundError("Inquiry");

  const venue = Array.isArray(inquiry.venues)
    ? inquiry.venues[0]
    : inquiry.venues;
  const org = venue?.organizations
    ? Array.isArray(venue.organizations)
      ? venue.organizations[0]
      : venue.organizations
    : null;
  const organizationId = (venue?.organization_id as string | null) ?? null;
  const venueOrgOwnerId = (org?.owner_id as string | null) ?? null;

  if (inquiry.customer_id === userId) {
    return {
      inquiry: {
        id: inquiry.id,
        venue_id: inquiry.venue_id,
        customer_id: inquiry.customer_id,
        status: inquiry.status,
        organization_id: organizationId,
        venue_org_owner_id: venueOrgOwnerId,
      },
      role: "customer",
    };
  }

  const isAdmin = await isAdminUser(supabase, userId);
  if (isAdmin) {
    return {
      inquiry: {
        id: inquiry.id,
        venue_id: inquiry.venue_id,
        customer_id: inquiry.customer_id,
        status: inquiry.status,
        organization_id: organizationId,
        venue_org_owner_id: venueOrgOwnerId,
      },
      role: "venue_team",
    };
  }

  if (!organizationId) {
    throw new ForbiddenError("You do not have access to this inquiry.");
  }

  const [{ data: member }, { data: orgOwner }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id, permissions")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId)
      .eq("owner_id", userId)
      .maybeSingle(),
  ]);

  if (orgOwner) {
    return {
      inquiry: {
        id: inquiry.id,
        venue_id: inquiry.venue_id,
        customer_id: inquiry.customer_id,
        status: inquiry.status,
        organization_id: organizationId,
        venue_org_owner_id: venueOrgOwnerId,
      },
      role: "venue_team",
    };
  }

  if (!member) {
    throw new ForbiddenError("You do not have access to this inquiry.");
  }

  const permissions = Array.isArray(member.permissions)
    ? (member.permissions as string[])
    : [];

  if (!permissions.includes("message_assigned_customers")) {
    throw new ForbiddenError(
      "You do not have permission to message customers for this inquiry.",
    );
  }

  const { data: assignment } = await supabase
    .from("venue_coordinator_assignments")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("venue_id", inquiry.venue_id)
    .maybeSingle();

  if (!assignment) {
    throw new ForbiddenError(
      "You are not assigned to this venue and cannot message its customers.",
    );
  }

  return {
    inquiry: {
      id: inquiry.id,
      venue_id: inquiry.venue_id,
      customer_id: inquiry.customer_id,
      status: inquiry.status,
      organization_id: organizationId,
      venue_org_owner_id: venueOrgOwnerId,
    },
    role: "venue_team",
  };
}

export async function notifyVenueTeamOfInquiry(
  supabase: any,
  params: {
    inquiryId: string;
    venueId: string;
    organizationId: string | null;
    venueOrgOwnerId: string | null;
    preview: string;
    excludeUserId?: string | null;
  },
) {
  const recipientIds = new Set<string>();

  if (
    params.venueOrgOwnerId &&
    params.venueOrgOwnerId !== params.excludeUserId
  ) {
    recipientIds.add(params.venueOrgOwnerId);
  }

  if (params.organizationId) {
    const { data: assignments } = await supabase
      .from("venue_coordinator_assignments")
      .select("user_id")
      .eq("organization_id", params.organizationId)
      .eq("venue_id", params.venueId);

    const assignedUserIds = ((assignments ?? []) as Array<{ user_id: string }>)
      .map((row) => row.user_id)
      .filter((id) => id !== params.excludeUserId);

    if (assignedUserIds.length > 0) {
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", params.organizationId)
        .eq("status", "active")
        .in("user_id", assignedUserIds);

      for (const row of (members ?? []) as Array<{ user_id: string }>) {
        recipientIds.add(row.user_id);
      }
    }
  }

  await insertNotificationsForUsers(
    [...recipientIds].map((userId) => ({
      user_id: userId,
      title: "New venue inquiry message",
      body: params.preview,
      link: `/dashboard/coordinator/messages?thread=inquiry:${params.inquiryId}`,
      kind: "booking_update",
    })),
  );
}

export async function getVenueInquiryMessages(
  inquiryId: string,
): Promise<VenueInquiryMessage[]> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  try {
    await assertVenueInquiryAccess(supabase, inquiryId, user.id);
  } catch {
    return [];
  }

  const { data, error } = await supabase
    .from("venue_inquiry_messages")
    .select("id, inquiry_id, sender_id, message, created_at")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[venue_inquiry_messages] fetch error:", error.message);
    return [];
  }

  const messages = data ?? [];
  if (messages.length === 0) return [];

  const senderIds = Array.from(new Set(messages.map((m: any) => m.sender_id)));
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", senderIds);

  const profilesMap = new Map(
    (profilesData ?? []).map((p: any) => [p.id, p.full_name]),
  );

  return messages.map((msg: any) => ({
    id: msg.id,
    inquiry_id: msg.inquiry_id,
    sender_id: msg.sender_id,
    message: msg.message,
    created_at: msg.created_at,
    sender_name: profilesMap.get(msg.sender_id) ?? null,
  }));
}

export async function sendVenueInquiryMessageAction(rawInput: unknown) {
  return createServerAction(
    sendVenueInquiryMessageSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError("You must be signed in to send messages.");
      }

      if (input.message.trim().length === 0) {
        throw new ValidationError("Message cannot be empty.");
      }

      const { inquiry, role } = await assertVenueInquiryAccess(
        supabase,
        input.inquiryId,
        user.id,
      );

      if (inquiry.status === "closed") {
        throw new ValidationError(
          "This inquiry is closed and no longer accepts messages.",
        );
      }

      const { data: inserted, error: insertError } = await supabase
        .from("venue_inquiry_messages")
        .insert({
          inquiry_id: input.inquiryId,
          sender_id: user.id,
          message: input.message.trim(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(
          "[venue_inquiry_messages] insert error:",
          insertError.message,
        );
        throw new ValidationError("Failed to send message. Please try again.");
      }

      if (role === "venue_team" && inquiry.status === "new") {
        await supabase
          .from("inquiries")
          .update({ status: "responded" })
          .eq("id", inquiry.id)
          .eq("status", "new");
      }

      try {
        if (role === "customer") {
          await notifyVenueTeamOfInquiry(supabase, {
            inquiryId: inquiry.id,
            venueId: inquiry.venue_id,
            organizationId: inquiry.organization_id,
            venueOrgOwnerId: inquiry.venue_org_owner_id,
            preview: input.message,
            excludeUserId: user.id,
          });
        } else {
          const notifications = [];

          if (inquiry.customer_id !== user.id) {
            notifications.push({
              user_id: inquiry.customer_id,
              title: "New venue inquiry reply",
              body: input.message,
              link: `/account/venue-inquiries/${inquiry.id}`,
              kind: "booking_update",
            });
          }

          // Also ping other venue-team members so every role stays in sync
          const recipientIds = new Set<string>();
          if (
            inquiry.venue_org_owner_id &&
            inquiry.venue_org_owner_id !== user.id
          ) {
            recipientIds.add(inquiry.venue_org_owner_id);
          }
          if (inquiry.organization_id) {
            const { data: assignments } = await supabase
              .from("venue_coordinator_assignments")
              .select("user_id")
              .eq("organization_id", inquiry.organization_id)
              .eq("venue_id", inquiry.venue_id);

            for (const row of (assignments ?? []) as Array<{ user_id: string }>) {
              if (row.user_id !== user.id) recipientIds.add(row.user_id);
            }
          }

          for (const userId of recipientIds) {
            notifications.push({
              user_id: userId,
              title: "New venue inquiry message",
              body: input.message,
              link: `/dashboard/coordinator/messages?thread=inquiry:${inquiry.id}`,
              kind: "booking_update",
            });
          }

          await insertNotificationsForUsers(notifications);
        }
      } catch {
        // Notification failure must not block message send
      }

      revalidatePath(`/account/venue-inquiries/${inquiry.id}`);
      revalidatePath("/account/venue-inquiries");
      revalidatePath("/dashboard/coordinator/messages");

      return { ok: true, messageId: inserted?.id as string };
    },
    rawInput,
  );
}
