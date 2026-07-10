"use server";

import { createClient } from "@/lib/supabase/server";
import { toErrorMessage } from "@/lib/errors";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
};

export async function generateVerificationUploadUrlsAction(
  role: string,
  files: { name: string; type: string; size: number }[]
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    // Check application status
    const { data: existingApp } = await (supabase as any)
      .from("partner_applications")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingApp && ["pending", "approved", "denied"].includes(existingApp.status)) {
      return { success: false, error: "Cannot upload documents for a submitted application." };
    }

    if (!files || files.length === 0) {
      return { success: false, error: "No files provided." };
    }

    if (files.length > 10) {
      return { success: false, error: "Too many files." };
    }

    const uploadPayloads = [];

    for (const file of files) {
      if (file.size <= 0 || file.size > MAX_SIZE) {
        return { success: false, error: `Invalid file size for ${file.name}. Max 20MB.` };
      }

      const allowedExts = ALLOWED_MIME_TYPES[file.type];
      if (!allowedExts) {
        return { success: false, error: `Disallowed MIME type for ${file.name}.` };
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !allowedExts.includes(ext)) {
        return { success: false, error: `Extension mismatch for ${file.name}.` };
      }

      const uuid = crypto.randomUUID();
      const path = `${user.id}/${role}/${uuid}.${ext}`;

      const { data, error } = await supabase.storage
        .from("verification-docs")
        .createSignedUploadUrl(path);

      if (error || !data) {
        console.error("[generateUploadUrl]", error);
        return { success: false, error: "Failed to generate upload URL." };
      }

      uploadPayloads.push({
        path,
        token: data.token,
        signedUrl: data.signedUrl,
        fileInfo: file,
      });
    }

    return {
      success: true,
      payloads: uploadPayloads,
    };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function finalizeVerificationUploadAction(paths: string[]) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    for (const path of paths) {
      // Must start with user.id
      if (!path.startsWith(`${user.id}/`)) {
        return { success: false, error: "Path ownership mismatch." };
      }

      // We need to use service role to stat the file?
      // No, authenticated user can select their own files due to RLS
      // However, list or head object might require specific policies, but RLS SELECT allows reading.
      // Wait, there's no `stat` API in supabase-js that's standard without downloading, 
      // but `list` works if we list the folder.
      
      const folderPath = path.substring(0, path.lastIndexOf('/'));
      const filename = path.split('/').pop()!;
      
      const { data: listData, error: listError } = await supabase.storage
        .from("verification-docs")
        .list(folderPath, { search: filename });

      if (listError) {
        console.error("Failed to verify uploaded file existence", listError);
        return { success: false, error: "Could not verify upload." };
      }

      const uploadedFile = listData?.find(f => f.name === filename);
      if (!uploadedFile) {
        return { success: false, error: `File not found in storage: ${path}` };
      }

      // Check size again as a final guard
      if (!uploadedFile.metadata?.size || uploadedFile.metadata.size > MAX_SIZE) {
        // Attempt cleanup using the same auth
        await supabase.storage.from("verification-docs").remove([path]);
        return { success: false, error: "Uploaded file exceeded size limit. Removed." };
      }
      
      // Check MIME type again
      const mime = uploadedFile.metadata?.mimetype;
      if (!mime || !Object.keys(ALLOWED_MIME_TYPES).includes(mime)) {
        await supabase.storage.from("verification-docs").remove([path]);
        return { success: false, error: "Uploaded file has disallowed MIME type. Removed." };
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
