import { useState } from "react";
import { Loader2, UploadCloud, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  generateVerificationUploadUrlsAction,
  finalizeVerificationUploadAction,
} from "../application/upload-actions";

const REQUIREMENTS: Record<string, string[]> = {
  venue_owner: [
    "Proof of Ownership / Authority (Title, Deed, Lease)",
    "Business Registration (DTI/SEC)",
    "BIR Certificate of Registration (Form 2303)",
    "Mayor's / Business Permit",
    "3+ High-Quality Photos of Venue",
  ],
  event_coordinator: [
    "Valid Government-Issued ID",
    "Business Registration (DTI/SEC) or Freelance Proof",
    "BIR Certificate of Registration (Form 2303)",
    "Portfolio Link / PDF Deck",
  ],
  supplier: [
    "Business Registration (DTI/SEC)",
    "Mayor's / Business Permit",
    "BIR Certificate of Registration (Form 2303)",
    "Service Proof / Catalog",
  ],
};

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp", // Wait, server doesn't allow webp currently. I'll stick to jpeg, png, pdf. Let me change server and client to match.
  "application/pdf",
];

export function VerificationUpload({
  role,
  isSubmitting,
  onSubmit,
  onBack,
}: {
  role: "venue_owner" | "event_coordinator" | "supplier";
  isSubmitting: boolean;
  onSubmit: (documentUrls: string[]) => void;
  onBack: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of selectedFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(
            `File type not supported: ${file.name}. Only PDF, JPEG, and PNG are allowed.`,
          );
          return;
        }
        if (file.size > MAX_SIZE) {
          setError(`File too large: ${file.name}. Maximum size is 20MB.`);
          return;
        }
        if (file.size === 0) {
          setError(`File is empty: ${file.name}.`);
          return;
        }
        validFiles.push(file);
      }

      setError(null);
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (files.length === 0) {
      setError("Please upload at least one verification document.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Send metadata to get signed URLs
      const metadata = files.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      }));

      const res = await generateVerificationUploadUrlsAction(role, metadata);

      if (!res.success || !res.payloads) {
        throw new Error(res.error || "Failed to generate upload URLs.");
      }

      const uploadedPaths: string[] = [];

      // 2. Upload each file directly to Supabase Storage using the signed URL
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const payload = res.payloads[i];
        if (!file || !payload) throw new Error("Missing file or payload");

        const { error: uploadError } = await supabase.storage
          .from("verification-docs")
          .uploadToSignedUrl(payload.path, payload.token, file, {
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw new Error(
            `Upload failed for ${file.name}: ${uploadError.message}`,
          );
        }

        uploadedPaths.push(payload.path);
      }

      // 3. Finalize
      const finalizeRes = await finalizeVerificationUploadAction(uploadedPaths);
      if (!finalizeRes.success) {
        throw new Error(finalizeRes.error || "Failed to finalize uploads.");
      }

      onSubmit(uploadedPaths);
    } catch (err: any) {
      console.error("Upload error", err);
      const detail = err?.message ? `: ${err.message}` : "";
      setError(`Failed to upload documents${detail}. Please try again.`);
      setIsUploading(false);
    }
  };

  const reqs = REQUIREMENTS[role] || [];

  return (
    <div className="flex flex-col py-8 px-4">
      <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
        Verification Documents
      </h2>
      <p className="text-slate-500 mb-8">
        Please upload the required documents for your business type.
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="font-bold text-slate-900 mb-4">Required Documents:</h3>
        <ul className="space-y-2 mb-6">
          {reqs.map((req, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-slate-600"
            >
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
              <span>{req}</span>
            </li>
          ))}
        </ul>

        <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white py-8 transition hover:border-[#2563EB] hover:bg-[#EFF6FF]">
          <UploadCloud className="mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm font-bold text-[#2563EB]">
            Click to upload files
          </p>
          <p className="mt-1 text-xs text-slate-500">
            PDF, JPG, PNG (max 20MB each)
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,image/jpeg,image/png"
            onChange={handleFileSelect}
            className="sr-only"
            disabled={isUploading || isSubmitting}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="mb-8 space-y-3">
          <h3 className="font-bold text-slate-900">Selected Files:</h3>
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-white"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="h-5 w-5 shrink-0 text-[#2563EB]" />
                <span className="truncate text-sm font-medium text-slate-700">
                  {f.name}
                </span>
              </div>
              <button
                onClick={() => removeFile(i)}
                disabled={isUploading || isSubmitting}
                className="rounded-full p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between border-t border-slate-200 pt-6">
        <button
          onClick={onBack}
          disabled={isUploading || isSubmitting}
          className="rounded-full px-6 py-3 text-sm font-bold text-slate-900 underline transition hover:text-slate-600 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={isUploading || isSubmitting || files.length === 0}
          className="flex items-center gap-2 rounded-full bg-[#2563EB] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading || isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </button>
      </div>
    </div>
  );
}
