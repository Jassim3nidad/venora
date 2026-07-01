"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, signInWithOAuthAction } from "@/features/auth/actions/auth.actions";
import { loginSchema } from "@/features/auth/schemas/auth.schema";

// ─── Success alert ─────────────────────────────────────────────────────────────

type AlertVariant = "success" | "info";

function Alert({ variant, children }: { variant: AlertVariant; children: React.ReactNode }) {
  const styles: Record<AlertVariant, React.CSSProperties> = {
    success: {
      background: "linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(22, 163, 74, 0.06))",
      border: "1px solid rgba(22, 163, 74, 0.3)",
      color: "hsl(142 60% 40%)",
    },
    info: {
      background: "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.06))",
      border: "1px solid rgba(37, 99, 235, 0.3)",
      color: "hsl(217 70% 47%)",
    },
  };

  const icons: Record<AlertVariant, string> = {
    success: "✓",
    info: "✉",
  };

  return (
    <div
      role="status"
      style={{
        ...styles[variant],
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        padding: "0.875rem 1rem",
        borderRadius: "0.625rem",
        fontSize: "0.8125rem",
        lineHeight: 1.6,
        marginBottom: "1.25rem",
        animation: "slideDown 0.3s ease",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: "1.25rem",
          height: "1.25rem",
          borderRadius: "50%",
          background: styles[variant].color as string,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
          fontWeight: 700,
          marginTop: "0.05rem",
        }}
      >
        {icons[variant]}
      </span>
      <span>{children}</span>
    </div>
  );
}

// ─── Inner login form (needs useSearchParams, must be inside Suspense) ─────────

function LoginForm() {
  const searchParams = useSearchParams();
  const didReset = searchParams.get("reset") === "true";
  const didRegister = searchParams.get("registered") === "true";

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
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="glass animate-scale-in"
        style={{ width: "100%", maxWidth: 420, padding: "2.5rem", borderRadius: "1.5rem" }}
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

        {/* ── Success banners ── */}
        {didReset && (
          <Alert variant="success">
            Your password has been reset successfully. Please sign in with your new password.
          </Alert>
        )}

        {didRegister && (
          <Alert variant="info">
            Registration successful! Please check your email to verify your account before signing in.
          </Alert>
        )}

        {/* ── Error banner ── */}
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

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-default)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-default)" }} />
        </div>

        <button
          id="google-signin-btn"
          type="button"
          disabled={isPending}
          onClick={() => {
            setGeneralError(null);
            startTransition(async () => {
              const res = await signInWithOAuthAction("google");
              if (res && !res.success) {
                setGeneralError(res.error);
              }
            });
          }}
          style={{
            height: "2.75rem",
            width: "100%",
            borderRadius: "0.625rem",
            background: "#fff",
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: "0.9375rem",
            border: "1px solid var(--border-default)",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "background 0.15s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.59.1-1.17.282-1.707V4.96H.957A9 9 0 000 9c0 1.488.364 2.9 1.008 4.148l2.956-2.441z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.505.454 3.436 1.346l2.58-2.58A8.96 8.96 0 009 0 9 9 0 001.008 4.96l2.956 2.441c.708-2.127 2.692-3.711 5.036-3.711z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

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

// ─── Default export wraps LoginForm in Suspense ────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
