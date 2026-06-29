import type { Metadata } from "next";

export const metadata: Metadata = { title: "Unauthorized Access" };

export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="glass animate-scale-in" style={{ width: "100%", maxWidth: 460, padding: "3rem", borderRadius: "1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>⚠️</div>
        <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Access Denied
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "2rem" }}>
          You do not have the required role or permissions to view this resource. Please make sure you are logged in to the correct account type.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <a
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "2.75rem",
              borderRadius: "0.625rem",
              background: "hsl(217 70% 47%)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
              boxShadow: "0 4px 16px -4px hsl(217 70% 47% / 0.5)",
            }}
          >
            Sign in with another account
          </a>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "2.75rem",
              borderRadius: "0.625rem",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
            }}
          >
            Return to Homepage
          </a>
        </div>
      </div>
    </div>
  );
}
