"use client";

import { useState, useEffect, useTransition } from "react";
import { resetPasswordAction } from "@/features/auth/actions/auth.actions";
import { resetPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { createClient } from "@/lib/supabase/client";

// ─── Invalid / Expired Link view ──────────────────────────────────────────────

function ExpiredLinkView() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div
        className="glass animate-scale-in"
        style={{ width: "100%", maxWidth: 420, padding: "2.5rem", borderRadius: "1.5rem", textAlign: "center" }}
      >
        <div
          style={{
            width: "4.5rem",
            height: "4.5rem",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.06))",
            border: "1px solid rgba(220,38,38,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            margin: "0 auto 1.25rem",
          }}
        >
          🔗
        </div>

        <h1
          style={{
            fontFamily: "var(--font-sora, sans-serif)",
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
            color: "var(--text-primary)",
          }}
        >
          Link invalid or expired
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            lineHeight: 1.7,
            marginBottom: "2rem",
          }}
        >
          This password reset link has already been used or has expired.
          Request a fresh link and try again.
        </p>

        <a
          href="/forgot-password"
          id="request-new-link-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "2.75rem",
            padding: "0 1.75rem",
            borderRadius: "0.625rem",
            background: "hsl(217 70% 47%)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.9375rem",
            textDecoration: "none",
            boxShadow: "0 4px 16px -4px hsl(217 70% 47% / 0.5)",
            transition: "opacity 0.15s ease",
          }}
        >
          Request a new link
        </a>

        <p style={{ marginTop: "1.25rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          <a href="/login" style={{ color: "hsl(217 70% 47%)", textDecoration: "none" }}>
            ← Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Reset Password form ───────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Check for a valid recovery session on mount.
  // Supabase exchanges the reset token for a session via the /auth/callback route.
  // If no session exists the link is invalid or expired.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setSessionChecked(true);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await resetPasswordAction({ password, confirmPassword });
      if (response && !response.success) {
        setGeneralError(response.error);
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  // Show nothing while we verify the session to avoid a layout flash.
  if (!sessionChecked) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", border: "2px solid var(--border-default)", borderTopColor: "hsl(217 70% 47%)", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!hasSession) {
    return <ExpiredLinkView />;
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="glass animate-scale-in" style={{ width: "100%", maxWidth: 420, padding: "2.5rem", borderRadius: "1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔑</div>
          <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            Set new password
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Enter your new secure password below.
          </p>
        </div>

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
              marginBottom: "1.25rem",
            }}
          >
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="new-password" style={{ fontSize: "0.875rem", fontWeight: 500 }}>New Password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isPending}
              style={{
                height: "2.75rem",
                borderRadius: "0.625rem",
                border: fieldErrors.password ? "1px solid rgb(220, 38, 38)" : "1px solid var(--border-default)",
                padding: "0 0.875rem",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.9375rem",
                outline: "none",
                width: "100%",
              }}
            />
            {fieldErrors.password && (
              <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{fieldErrors.password[0]}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="confirm-new-password" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Confirm New Password</label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isPending}
              style={{
                height: "2.75rem",
                borderRadius: "0.625rem",
                border: fieldErrors.confirmPassword ? "1px solid rgb(220, 38, 38)" : "1px solid var(--border-default)",
                padding: "0 0.875rem",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.9375rem",
                outline: "none",
                width: "100%",
              }}
            />
            {fieldErrors.confirmPassword && (
              <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{fieldErrors.confirmPassword[0]}</span>
            )}
          </div>

          <button
            id="reset-submit-btn"
            type="submit"
            disabled={isPending}
            style={{
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
            {isPending ? "Setting Password..." : "Update Password"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          <a href="/login" style={{ color: "hsl(217 70% 47%)", textDecoration: "none" }}>Cancel and return to sign in</a>
        </p>
      </div>
    </div>
  );
}
