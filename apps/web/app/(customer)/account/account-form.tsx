"use client";

import { useState, useTransition } from "react";
import { updateProfileAction, signOutAction, resetPasswordAction } from "@/features/auth/actions/auth.actions";
import { updateProfileSchema, resetPasswordSchema } from "@/features/auth/schemas/auth.schema";

interface AccountFormProps {
  initialFullName: string;
  initialPhone: string;
}

export default function AccountForm({ initialFullName, initialPhone }: AccountFormProps) {
  // Profile Details State
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Password Change State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState<Record<string, string[]>>({});
  const [pwdGeneralError, setPwdGeneralError] = useState<string | null>(null);
  const [pwdSuccessMessage, setPwdSuccessMessage] = useState<string | null>(null);
  const [isPwdPending, startPwdTransition] = useTransition();

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        setSuccessMessage("Profile updated successfully!");
      } else if (response) {
        setGeneralError(response.error);
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFieldErrors({});
    setPwdGeneralError(null);
    setPwdSuccessMessage(null);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setPwdFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startPwdTransition(async () => {
      const response = await resetPasswordAction({ password, confirmPassword });
      if (response && response.success) {
        setPwdSuccessMessage("Password changed successfully!");
        setPassword("");
        setConfirmPassword("");
      } else if (response) {
        setPwdGeneralError(response.error || "Failed to update password.");
        if (response.fieldErrors) {
          setPwdFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ─── Profile details section ─── */}
      <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <h3 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.125rem", fontWeight: 700, borderBottom: "1px solid var(--border-default)", paddingBottom: "0.5rem", color: "var(--text-primary)" }}>
          Profile Details
        </h3>

        {successMessage && (
          <div
            role="status"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              color: "rgb(16, 185, 129)",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            {successMessage}
          </div>
        )}

        {generalError && (
          <div
            role="alert"
            style={{
              background: "rgba(220, 38, 38, 0.1)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              color: "rgb(220, 38, 38)",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            {generalError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="account-full-name" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Full Name</label>
          <input
            id="account-full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isPending}
            style={{
              height: "2.75rem",
              borderRadius: "0.625rem",
              border: fieldErrors.fullName ? "1px solid rgb(220, 38, 38)" : "1px solid var(--border-default)",
              padding: "0 0.875rem",
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
              fontSize: "0.9375rem",
              outline: "none",
              width: "100%",
            }}
          />
          {fieldErrors.fullName && (
            <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{fieldErrors.fullName[0]}</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="account-phone" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Phone Number</label>
          <input
            id="account-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09171234567"
            disabled={isPending}
            style={{
              height: "2.75rem",
              borderRadius: "0.625rem",
              border: fieldErrors.phone ? "1px solid rgb(220, 38, 38)" : "1px solid var(--border-default)",
              padding: "0 0.875rem",
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
              fontSize: "0.9375rem",
              outline: "none",
              width: "100%",
            }}
          />
          {fieldErrors.phone && (
            <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{fieldErrors.phone[0]}</span>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
          <button
            id="account-save-btn"
            type="submit"
            disabled={isPending}
            style={{
              flex: 1,
              height: "2.75rem",
              borderRadius: "0.625rem",
              background: "#E07A5F",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              boxShadow: "0 4px 16px -4px rgba(224, 122, 95, 0.5)",
              transition: "background 0.2s",
            }}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            style={{
              height: "2.75rem",
              borderRadius: "0.625rem",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-primary)",
              fontWeight: 600,
              padding: "0 1.25rem",
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </form>

      {/* ─── Change password section ─── */}
      <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1rem" }}>
        <h3 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.125rem", fontWeight: 700, borderBottom: "1px solid var(--border-default)", paddingBottom: "0.5rem", color: "var(--text-primary)" }}>
          Change Password
        </h3>

        {pwdSuccessMessage && (
          <div
            role="status"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              color: "rgb(16, 185, 129)",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            {pwdSuccessMessage}
          </div>
        )}

        {pwdGeneralError && (
          <div
            role="alert"
            style={{
              background: "rgba(220, 38, 38, 0.1)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              color: "rgb(220, 38, 38)",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            {pwdGeneralError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="account-password" style={{ fontSize: "0.875rem", fontWeight: 500 }}>New Password</label>
          <input
            id="account-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isPwdPending}
            style={{
              height: "2.75rem",
              borderRadius: "0.625rem",
              border: pwdFieldErrors.password ? "1px solid rgb(220, 38, 38)" : "1px solid var(--border-default)",
              padding: "0 0.875rem",
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
              fontSize: "0.9375rem",
              outline: "none",
              width: "100%",
            }}
          />
          {pwdFieldErrors.password && (
            <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{pwdFieldErrors.password[0]}</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="account-confirm-password" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Confirm New Password</label>
          <input
            id="account-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isPwdPending}
            style={{
              height: "2.75rem",
              borderRadius: "0.625rem",
              border: pwdFieldErrors.confirmPassword ? "1px solid rgb(220, 38, 38)" : "1px solid var(--border-default)",
              padding: "0 0.875rem",
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
              fontSize: "0.9375rem",
              outline: "none",
              width: "100%",
            }}
          />
          {pwdFieldErrors.confirmPassword && (
            <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{pwdFieldErrors.confirmPassword[0]}</span>
          )}
        </div>

        <button
          id="account-change-pwd-btn"
          type="submit"
          disabled={isPwdPending}
          style={{
            height: "2.75rem",
            borderRadius: "0.625rem",
            background: "#E07A5F",
            color: "#fff",
            fontWeight: 600,
            border: "none",
            cursor: isPwdPending ? "not-allowed" : "pointer",
            opacity: isPwdPending ? 0.7 : 1,
            boxShadow: "0 4px 16px -4px rgba(224, 122, 95, 0.5)",
            transition: "background 0.2s",
            marginTop: "0.5rem",
          }}
        >
          {isPwdPending ? "Updating Password..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
