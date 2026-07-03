"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  changePasswordAction,
  updateProfileAction,
} from "@/features/auth/actions/auth.actions";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/features/auth/schemas/auth.schema";

interface AccountFormProps {
  initialFullName: string;
  initialPhone: string;
}


type FieldErrors = Record<string, string[]>;

function AlertBanner({
  type,
  children,
}: {
  type: "success" | "error";
  children: ReactNode;
}) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={[
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6",
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[#E5E7EB]/80 pb-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            {eyebrow}
          </p>
          <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
            {title}
          </h2>
        </div>
      </div>

      <p className="max-w-2xl text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  error,
  icon: Icon,
  autoComplete,
  showPassword,
  onShowPasswordChange,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string | undefined;
  icon: React.ElementType;
  autoComplete?: string;
  showPassword?: boolean;
  onShowPasswordChange?: (show: boolean) => void;
}) {
  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={[
            "h-12 w-full rounded-2xl border bg-[#F9FAFB] pl-11 pr-11 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              : "border-slate-200 hover:border-[#E5E7EB] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10",
          ].join(" ")}
        />

        {isPasswordField && onShowPasswordChange && (
          <button
            type="button"
            onClick={() => onShowPasswordChange(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function SubmitButton({
  id,
  isPending,
  pendingText,
  children,
  icon: Icon,
}: {
  id: string;
  isPending: boolean;
  pendingText: string;
  children: ReactNode;
  icon: React.ElementType;
}) {
  return (
    <button
      id={id}
      type="submit"
      disabled={isPending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563EB]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <Icon className="h-4 w-4" />
      {isPending ? pendingText : children}
    </button>
  );
}

export default function AccountForm({
  initialFullName,
  initialPhone,
}: AccountFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState<FieldErrors>({});
  const [pwdGeneralError, setPwdGeneralError] = useState<string | null>(null);
  const [pwdSuccessMessage, setPwdSuccessMessage] = useState<string | null>(
    null,
  );
  const [isPwdPending, startPwdTransition] = useTransition();

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setFullName(initialFullName);
    setPhone(initialPhone);
    setSuccessMessage(null);
  }, [initialFullName, initialPhone]);

  const handleProfileSubmit = (event: FormEvent) => {
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
        // Immediately update state with returned data
        if (response && (response as any).data) {
          setFullName((response as any).data.full_name || fullName);
          setPhone((response as any).data.phone || phone);
        }
        // Then refresh to ensure page component shows updated data too
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

  const handlePasswordSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPwdFieldErrors({});
    setPwdGeneralError(null);
    setPwdSuccessMessage(null);

    const result = changePasswordSchema.safeParse({
      oldPassword,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setPwdFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startPwdTransition(async () => {
      const response = await changePasswordAction({
        oldPassword,
        password,
        confirmPassword,
      });

      if (response && response.success) {
        setPwdSuccessMessage("Password changed successfully.");
        setOldPassword("");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      if (response) {
        setPwdGeneralError(response.error || "Failed to update password.");
        if (response.fieldErrors) {
          setPwdFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  return (
    <div className="relative">
      <div className="absolute left-[-120px] top-[-80px] -z-10 h-[260px] w-[260px] rounded-full bg-[#2563EB]/10 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-80px] -z-10 h-[280px] w-[280px] rounded-full bg-[#DBEAFE]/10 blur-3xl" />

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
          Account settings
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <form
          onSubmit={handleProfileSubmit}
          className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60"
        >
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
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60"
        >
          <div className="p-6 sm:p-8">
            <SectionHeader
              icon={KeyRound}
              eyebrow="Security"
              title="Change password"
              description="Choose a strong password to keep your venue searches, bookings, and account activity protected."
            />

            <div className="mt-6 space-y-5">
              {pwdSuccessMessage && (
                <AlertBanner type="success">{pwdSuccessMessage}</AlertBanner>
              )}

              {pwdGeneralError && (
                <AlertBanner type="error">{pwdGeneralError}</AlertBanner>
              )}

              <TextField
                id="account-old-password"
                label="Current password"
                type="password"
                value={oldPassword}
                onChange={setOldPassword}
                placeholder="Enter password"
                disabled={isPwdPending}
                error={pwdFieldErrors.oldPassword?.[0]}
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
                disabled={isPwdPending}
                error={pwdFieldErrors.password?.[0]}
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
                disabled={isPwdPending}
                error={pwdFieldErrors.confirmPassword?.[0]}
                icon={ShieldCheck}
                autoComplete="new-password"
                showPassword={showConfirmPassword}
                onShowPasswordChange={setShowConfirmPassword}
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">
                  Password tips
                </p>
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
              isPending={isPwdPending}
              pendingText="Updating password..."
              icon={KeyRound}
            >
              Update Password
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}