"use client";

import { useState, useTransition } from "react";
import { forgotPasswordAction } from "@/features/auth/actions/auth.actions";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess(false);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await forgotPasswordAction({ email });
      if (response && response.success) {
        setSuccess(true);
      } else {
        // Even if there is an error, we keep it consistent or show general warning
        setFieldErrors({ email: ["Unable to send reset link. Please check your network and try again."] });
      }
    });
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="glass animate-scale-in" style={{ width: "100%", maxWidth: 420, padding: "2.5rem", borderRadius: "1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔒</div>
          <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            Forgot your password?
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {success ? (
          <div
            role="status"
            style={{
              background: "rgba(37, 99, 235, 0.1)",
              border: "1px solid rgba(37, 99, 235, 0.2)",
              color: "hsl(217 70% 47%)",
              padding: "1rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
              textAlign: "center",
            }}
          >
            If that email is registered, we have sent a password reset link to it. Please check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label htmlFor="forgot-email" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Email address</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isPending}
                style={{
                  height: "2.75rem",
                  borderRadius: "0.625rem",
                  border: fieldErrors.email ? "1px solid rgb(220, 38, 38)" : "1px solid var(--border-default)",
                  padding: "0 0.875rem",
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.9375rem",
                  outline: "none",
                  width: "100%",
                }}
              />
              {fieldErrors.email && (
                <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{fieldErrors.email[0]}</span>
              )}
            </div>
            <button
              id="forgot-submit-btn"
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
              }}
            >
              {isPending ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          <a href="/login" style={{ color: "hsl(217 70% 47%)", textDecoration: "none" }}>← Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
