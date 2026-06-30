"use client";

import { useState, useTransition } from "react";
import { registerAction, signInWithOAuthAction } from "@/features/auth/actions/auth.actions";
import { registerSchema } from "@/features/auth/schemas/auth.schema";

const ROLES = [
  { value: "customer",    label: "I want to book a venue",       emoji: "🎉" },
  { value: "venue_owner", label: "I own / manage a venue",       emoji: "🏛️" },
  { value: "supplier",    label: "I'm a supplier / vendor",      emoji: "🎨" },
  { value: "event_coordinator", label: "I coordinate events",      emoji: "🤝" },
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      role,
    });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await registerAction({
        fullName,
        email,
        password,
        confirmPassword,
        role,
      });

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
        style={{ width: "100%", maxWidth: 460, padding: "2.5rem", borderRadius: "1.5rem" }}
      >
        <h1
          style={{
            fontFamily: "var(--font-sora, sans-serif)",
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "0.25rem",
          }}
        >
          Create your account
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "2rem" }}>
          Join thousands of event planners on Venora
        </p>

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
            <label htmlFor="register-fullname" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Full Name</label>
            <input
              id="register-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Dela Cruz"
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
            <label htmlFor="register-email" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Email</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@example.com"
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

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="register-password" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Password</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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
            <label htmlFor="register-confirm-password" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Confirm Password</label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
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

          <fieldset style={{ border: "none", padding: 0 }}>
            <legend style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.625rem" }}>I am a…</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {ROLES.map((roleOption) => (
                <label
                  key={roleOption.value}
                  htmlFor={`role-${roleOption.value}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.625rem",
                    border: role === roleOption.value ? "2px solid hsl(217 70% 47%)" : "1px solid var(--border-default)",
                    background: role === roleOption.value ? "rgba(37, 99, 235, 0.05)" : "transparent",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: role === roleOption.value ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    id={`role-${roleOption.value}`}
                    name="role"
                    value={roleOption.value}
                    checked={role === roleOption.value}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isPending}
                    style={{ accentColor: "hsl(217 70% 47%)" }}
                  />
                  <span>{roleOption.emoji}</span>
                  <span>{roleOption.label}</span>
                </label>
              ))}
            </div>
            {fieldErrors.role && (
              <span style={{ fontSize: "0.75rem", color: "rgb(220, 38, 38)", marginTop: "0.25rem", display: "block" }}>{fieldErrors.role[0]}</span>
            )}
          </fieldset>

          <button
            id="register-submit-btn"
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
            {isPending ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-default)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-default)" }} />
        </div>

        <button
          id="google-register-btn"
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
          Already have an account?{" "}
          <a href="/login" style={{ color: "hsl(217 70% 47%)", fontWeight: 600, textDecoration: "none" }}>
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
