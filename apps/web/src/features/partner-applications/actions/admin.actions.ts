"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toErrorMessage } from "@/lib/errors";

export async function approveApplicationAction(applicationId: string) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the application
    const { data: application, error: fetchError } = await (supabase.from("partner_applications") as any)
      .select("user_id, role_applied_for, status")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      return { success: false, error: "Application not found" };
    }

    if (application.status !== "pending") {
      return { success: false, error: "Application is not pending" };
    }

    // Update status to approved
    const { error: updateError } = await (supabase.from("partner_applications") as any)
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Insert new role
    const { error: roleError } = await (supabase.from("user_roles") as any).insert({
      user_id: application.user_id,
      role: application.role_applied_for,
    });

    if (roleError) {
      // It might already exist if they had it previously, but we log the error just in case
      console.error("[approveApplicationAction] Role assignment error:", roleError);
    }

    revalidatePath("/admin/applications");

    return { success: true };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function denyApplicationAction(applicationId: string, reason: string) {
  if (!reason.trim()) {
    return { success: false, error: "A reason is required to deny an application." };
  }

  try {
    const supabase = await createClient();

    // Verify admin
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    // Update status to denied
    const { error: updateError } = await (supabase.from("partner_applications") as any)
      .update({ 
        status: "denied", 
        denial_reason: reason.trim(),
        updated_at: new Date().toISOString() 
      })
      .eq("id", applicationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/admin/applications");

    return { success: true };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
