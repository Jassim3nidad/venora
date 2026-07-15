"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { partnerApplicationSchema } from "../schemas/partner.schema";
import { toErrorMessage } from "@/lib/errors";

export async function submitPartnerApplicationAction(rawInput: unknown) {
  const parsed = partnerApplicationSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to apply.",
      };
    }

    const { error: insertError } = await (
      supabase.from("partner_applications") as any
    ).insert({
      user_id: user.id,
      role_applied_for: parsed.data.roleAppliedFor,
      category: parsed.data.category,
      address_country: parsed.data.address.country,
      address_unit: parsed.data.address.unit || null,
      address_building: parsed.data.address.building || null,
      address_street: parsed.data.address.street,
      address_district: parsed.data.address.district,
      address_city: parsed.data.address.city,
      address_zip: parsed.data.address.zip,
      documents_json: JSON.stringify(parsed.data.documents),
      status: "pending",
    });

    if (insertError) {
      console.error(
        "[submitPartnerApplicationAction] Database error:",
        insertError,
      );
      return {
        success: false,
        error: insertError.message,
      };
    }

    revalidatePath("/account/become-partner");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }
}
