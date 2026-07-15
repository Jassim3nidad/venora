"use client";

import { Circle, CheckCircle2, AlertCircle } from "lucide-react";

interface PasswordRequirementsProps {
  password?: string;
  confirmPassword?: string;
}

export function PasswordRequirements({
  password = "",
  confirmPassword = "",
}: PasswordRequirementsProps) {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9\s]/.test(password);

  // Show error only if confirmPassword has been typed into and they don't match
  const matchError = confirmPassword.length > 0 && password !== confirmPassword;
  const matchSuccess =
    confirmPassword.length > 0 && password === confirmPassword;

  const requirements = [
    {
      label: "At least 8 characters",
      satisfied: hasMinLength,
    },
    {
      label: "At least one uppercase letter",
      satisfied: hasUppercase,
    },
    {
      label: "At least one lowercase letter",
      satisfied: hasLowercase,
    },
    {
      label: "At least one symbol",
      satisfied: hasSymbol,
    },
    {
      label: "Passwords match",
      satisfied: matchSuccess,
      isError: matchError,
    },
  ];

  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      aria-live="polite"
    >
      <h3 className="mb-2 text-[14px] font-semibold text-slate-900">
        Password requirements
      </h3>
      <p className="mb-3 text-[13px] text-slate-500">
        Your password must include:
      </p>

      <ul className="flex flex-col gap-2">
        {requirements.map((req, i) => (
          <li key={i} className="flex items-center gap-2">
            {req.satisfied ? (
              <CheckCircle2 className="h-[16px] w-[16px] shrink-0 text-emerald-600" />
            ) : req.isError ? (
              <AlertCircle className="h-[16px] w-[16px] shrink-0 text-red-600" />
            ) : (
              <Circle className="h-[16px] w-[16px] shrink-0 text-slate-300" />
            )}
            <span
              className={`text-[13px] ${
                req.satisfied
                  ? "font-medium text-emerald-700"
                  : req.isError
                    ? "font-medium text-red-600"
                    : "text-slate-600"
              }`}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
