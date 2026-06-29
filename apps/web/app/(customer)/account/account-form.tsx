"use client";

import { useState, useTransition } from "react";
import { updateProfileAction, signOutAction } from "@/features/auth/actions/auth.actions";
import { updateProfileSchema } from "@/features/auth/schemas/auth.schema";

interface AccountFormProps {
  initialFullName: string;
  initialPhone: string;
}

export default function AccountForm({ initialFullName, initialPhone }: AccountFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
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

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
              background: "hsl(217 70% 47%)",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              boxShadow: "0 4px 16px -4px hsl(217 70% 47% / 0.5)",
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
    </div>
  );
}
