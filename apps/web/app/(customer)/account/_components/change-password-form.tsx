"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { changePasswordAction } from "@/features/auth/actions/auth.actions";
import { changePasswordSchema } from "@/features/auth/schemas/auth.schema";
import {
  AccountFormShell,
  AlertBanner,
  SectionHeader,
  SubmitButton,
  TextField,
  type FieldErrors,
} from "./account-form-shared";

export default function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    const result = changePasswordSchema.safeParse({
      oldPassword,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await changePasswordAction({
        oldPassword,
        password,
        confirmPassword,
      });

      if (response && response.success) {
        setSuccessMessage("Password changed successfully.");
        setOldPassword("");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      if (response) {
        setGeneralError(response.error || "Failed to update password.");
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
            icon={KeyRound}
            eyebrow="Security"
            title="Change password"
            description="Choose a strong password to keep your venue searches, bookings, and account activity protected."
          />

          <div className="mt-6 space-y-5">
            {successMessage && (
              <AlertBanner type="success">{successMessage}</AlertBanner>
            )}

            {generalError && (
              <AlertBanner type="error">{generalError}</AlertBanner>
            )}

            <TextField
              id="account-old-password"
              label="Current password"
              type="password"
              value={oldPassword}
              onChange={setOldPassword}
              placeholder="Enter password"
              disabled={isPending}
              error={fieldErrors.oldPassword?.[0]}
              icon={Lock}
              autoComplete="current-password"
              showPassword={showOldPassword}
              onShowPasswordChange={setShowOldPassword}
            />

            <TextField
              id="account-password"
              label="New password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password"
              disabled={isPending}
              error={fieldErrors.password?.[0]}
              icon={KeyRound}
              autoComplete="new-password"
              showPassword={showNewPassword}
              onShowPasswordChange={setShowNewPassword}
            />

            <TextField
              id="account-confirm-password"
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Enter password"
              disabled={isPending}
              error={fieldErrors.confirmPassword?.[0]}
              icon={ShieldCheck}
              autoComplete="new-password"
              showPassword={showConfirmPassword}
              onShowPasswordChange={setShowConfirmPassword}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-700">Password tips</p>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                Use at least 8 characters with a mix of letters, numbers, and
                symbols for better protection.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB]/80 bg-[#F9FAFB] px-6 py-5 sm:px-8">
          <SubmitButton
            id="account-change-pwd-btn"
            isPending={isPending}
            pendingText="Updating password..."
            icon={KeyRound}
          >
            Update Password
          </SubmitButton>
        </div>
      </AccountFormShell>
    </div>
  );
}
