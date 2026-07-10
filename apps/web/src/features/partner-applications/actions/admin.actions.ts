"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toErrorMessage } from "@/lib/errors";

// The verification-docs storage bucket is private (documents contain
// sensitive business/ID info), so a plain public URL 403s. This mints a
// short-lived signed URL instead, restricted to the document's owner or an
// admin.
export async function getVerificationDocumentUrlAction(path: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: isAdmin } = await supabase.rpc("is_admin");
    const ownsDocument = path.startsWith(`${user.id}/`);

    if (!isAdmin && !ownsDocument) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(path, 60 * 10);

    if (error || !data) {
      return { success: false, error: error?.message ?? "Could not generate document link" };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

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

    // Venora accounts hold exactly one role at a time (user_roles.user_id is
    // UNIQUE — see migration 022). Every user already has a "customer" role
    // from signup, so a plain INSERT here always violates that constraint and
    // silently fails, leaving the application marked "approved" without the
    // applicant ever receiving their new role. Upsert on user_id instead so
    // it replaces their existing role.
    const { error: roleError } = await (supabase.from("user_roles") as any).upsert(
      { user_id: application.user_id, role: application.role_applied_for },
      { onConflict: "user_id" },
    );

    if (roleError) {
      console.error("[approveApplicationAction] Role assignment error:", roleError);
      return {
        success: false,
        error: "Failed to assign the new role. Please try again.",
      };
    }

    // Only mark the application approved once the role has actually been granted.
    const { error: updateError } = await (supabase.from("partner_applications") as any)
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/admin/applications");
    revalidatePath("/account");
    revalidatePath("/account/become-partner");

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
    revalidatePath("/account/become-partner");

    return { success: true };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
