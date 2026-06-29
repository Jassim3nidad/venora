"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/features/auth/actions/auth.actions";
import { loginSchema } from "@/features/auth/schemas/auth.schema";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await loginAction({ email, password });
      if (response && !response.success) {
        setGeneralError(response.error);
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div
        className="glass animate-scale-in"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "2.5rem",
          borderRadius: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              fontSize: "1.75rem",
              fontWeight: 700,
              background: "linear-gradient(135deg, hsl(217 80% 63%), hsl(217 80% 47%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Welcome back
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
            Sign in to your Venora account
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
            <label htmlFor="login-email" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Email</label>
            <input
              id="login-email"
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
                fontSize: "0.9375rem",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                outline: "none",
                width: "100%",
              }}
            />
            {fieldErrors.email && (
              <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{fieldErrors.email[0]}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="login-password" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Password</label>
              <a href="/forgot-password" style={{ fontSize: "0.75rem", color: "hsl(217 70% 47%)", textDecoration: "none" }}>
                Forgot password?
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isPending}
              style={{
                height: "2.75rem",
                borderRadius: "0.625rem",
                border: fieldErrors.password ? "1px solid rgb(220, 38, 38)" : "1px solid var(--border-default)",
                padding: "0 0.875rem",
                fontSize: "0.9375rem",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                outline: "none",
                width: "100%",
              }}
            />
            {fieldErrors.password && (
              <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)" }}>{fieldErrors.password[0]}</span>
            )}
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isPending}
            style={{
              height: "2.75rem",
              borderRadius: "0.625rem",
              background: "hsl(217 70% 47%)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9375rem",
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              marginTop: "0.5rem",
              opacity: isPending ? 0.7 : 1,
              boxShadow: "0 4px 16px -4px hsl(217 70% 47% / 0.5)",
            }}
          >
            {isPending ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <a href="/register" style={{ color: "hsl(217 70% 47%)", fontWeight: 600, textDecoration: "none" }}>
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
