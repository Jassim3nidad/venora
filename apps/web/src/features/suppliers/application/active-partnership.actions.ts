"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function endPartnershipAction(partnershipId: string) {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error("Unauthorized");
  }

  // Fetch the supplier profile to ensure the user owns it
  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("id")
    .eq("profile_id", user.user.id)
    .single();

  if (!profile) {
    throw new Error("Supplier profile not found");
  }

  const { error } = await supabase
    .from("venue_suppliers")
    .update({ status: "ended" })
    .eq("id", partnershipId)
    .eq("supplier_id", profile.id);

  if (error) {
    console.error("Error ending partnership:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/supplier/partnerships");
  return { success: true };
}
