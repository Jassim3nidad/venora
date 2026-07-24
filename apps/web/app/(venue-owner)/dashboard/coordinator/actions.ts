"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ValidationError } from "@/src/lib/errors";
import { createServerAction } from "@/src/lib/server-action";
import { createClient } from "@/src/lib/supabase/server";

const respondToInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  accept: z.boolean(),
});

export async function respondToInvitationAction(rawInput: unknown) {
  return createServerAction(
    respondToInvitationSchema,
    async (input) => {
      const supabase = (await createClient()) as any;

      const { data, error } = await supabase.rpc(
        "respond_to_organization_member_invitation_by_id",
        {
          p_invitation_id: input.invitationId,
          p_accept: input.accept,
        },
      );

      if (error) {
        throw new ValidationError(
          error.message || "Failed to respond to invitation",
        );
      }

      revalidatePath("/dashboard/coordinator");
      revalidatePath("/dashboard/coordinator/venues");
      revalidatePath("/dashboard/coordinator/bookings");
      revalidatePath("/dashboard/coordinator/calendar");
      revalidatePath("/dashboard/coordinator/reports");
      return data;
    },
    rawInput,
  );
}
