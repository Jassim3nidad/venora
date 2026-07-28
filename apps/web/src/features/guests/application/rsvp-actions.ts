"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ValidationError } from "@/lib/errors";
import { createServerAction } from "@/lib/server-action";
import { publicGuestRsvpSchema } from "../schemas/guest.schema";

export async function respondToGuestRsvpAction(rawInput: unknown) {
  return createServerAction(
    publicGuestRsvpSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const { data, error } = await supabase.rpc("respond_to_guest_rsvp", {
        p_token: input.token,
        p_status: input.status,
        p_plus_ones: input.status === "attending" ? input.plusOnes : 0,
      });

      if (error) {
        throw new ValidationError(
          "This invitation is invalid, expired, or revoked.",
        );
      }

      revalidatePath(`/rsvp/${input.token}`);
      return { response: data?.[0] ?? null };
    },
    rawInput,
  );
}
