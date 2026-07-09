"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { updateProfileAction } from "@/features/auth/actions/auth.actions";
import { AvatarUpload } from "@/features/auth/ui/AvatarUpload";
import { updateProfileSchema } from "@/features/auth/schemas/auth.schema";
import {
  AccountFormShell,
  AlertBanner,
  SectionHeader,
  SubmitButton,
  TextField,
  type FieldErrors,
} from "./account-form-shared";

interface PersonalDetailsFormProps {
  userId: string;
  initialFullName: string;
  initialPhone: string;
  initialAvatarUrl: string | null;
}

export default function PersonalDetailsForm({
  userId,
  initialFullName,
  initialPhone,
  initialAvatarUrl,
}: PersonalDetailsFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFullName(initialFullName);
    setPhone(initialPhone);
    setSuccessMessage(null);
  }, [initialFullName, initialPhone]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    const result = updateProfileSchema.safeParse({ fullName, phone });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await updateProfileAction({ fullName, phone });

      if (response && response.success) {
        setSuccessMessage("Profile updated successfully.");
        if (response && (response as any).data) {
          setFullName((response as any).data.full_name || fullName);
          setPhone((response as any).data.phone || phone);
        }
        setTimeout(() => {
          router.refresh();
        }, 500);
        return;
      }

      if (response) {
        setGeneralError(response.error);
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <Link
        href="/account"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Personal Information
      </Link>

      <AccountFormShell onSubmit={handleSubmit}>
        <div className="p-6 sm:p-8">
          <SectionHeader
            icon={UserRound}
            eyebrow="Profile"
            title="Personal details"
            description="Keep your contact information updated so Venora can personalize your venue browsing and booking experience."
          />

          <div className="mt-6 space-y-5">
            {successMessage && (
              <AlertBanner type="success">{successMessage}</AlertBanner>
            )}

            {generalError && (
              <AlertBanner type="error">{generalError}</AlertBanner>
            )}

            <AvatarUpload
              userId={userId}
              initialAvatarUrl={initialAvatarUrl}
              displayName={fullName || initialFullName || "Venora User"}
            />

            <TextField
              id="account-full-name"
              label="Full name"
              value={fullName}
              onChange={setFullName}
              disabled={isPending}
              error={fieldErrors.fullName?.[0]}
              icon={UserRound}
              autoComplete="name"
            />

            <TextField
              id="account-phone"
              label="Phone number"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="09171234567"
              disabled={isPending}
              error={fieldErrors.phone?.[0]}
              icon={Phone}
              autoComplete="tel"
            />

            <div className="rounded-2xl border border-[#E5E7EB]/80 bg-[#F9FAFB] p-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Profile security note
                  </h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    Your profile details are used only for your Venora account
                    and booking-related communication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB]/80 bg-[#F9FAFB] px-6 py-5 sm:px-8">
          <SubmitButton
            id="account-save-btn"
            isPending={isPending}
            pendingText="Saving profile..."
            icon={Save}
          >
            Save Changes
          </SubmitButton>
        </div>
      </AccountFormShell>
    </div>
  );
}
