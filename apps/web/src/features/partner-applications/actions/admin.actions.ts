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
    // admin_approve_partner_application isn't in the hand-maintained
    // generated types yet (see packages/database/types/generated.ts header)
    // — cast, matching the same pattern used by other admin RPC call sites.
    const supabase = (await createClient()) as any;

    // Verify admin
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    // Call RPC
    const { error: rpcError } = await (supabase as any).rpc("admin_approve_partner_application", {
      p_application_id: applicationId,
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
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
    // admin_deny_partner_application isn't in the hand-maintained generated
    // types yet (see packages/database/types/generated.ts header) — cast,
    // matching the same pattern used by other admin RPC call sites.
    const supabase = (await createClient()) as any;

    // Verify admin
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    // Call RPC
    const { error: rpcError } = await (supabase as any).rpc("admin_deny_partner_application", {
      p_application_id: applicationId,
      p_reason: reason.trim(),
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    revalidatePath("/admin/applications");
    revalidatePath("/account/become-partner");

    return { success: true };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
