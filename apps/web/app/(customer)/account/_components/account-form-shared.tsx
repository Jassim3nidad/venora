"use client";

import type { FormEvent, ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

export type FieldErrors = Record<string, string[]>;

export function AlertBanner({
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

export function SectionHeader({
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

export function TextField({
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

export function SubmitButton({
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

export function AccountFormShell({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-[-120px] top-[-80px] -z-10 h-[260px] w-[260px] rounded-full bg-[#2563EB]/10 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-80px] -z-10 h-[280px] w-[280px] rounded-full bg-[#DBEAFE]/10 blur-3xl" />

      <form
        onSubmit={onSubmit}
        className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60"
      >
        {children}
      </form>
    </div>
  );
}
