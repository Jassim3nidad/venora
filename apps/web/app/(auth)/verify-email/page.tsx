import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify Email" };

export default function VerifyEmailPage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="glass animate-scale-in" style={{ width: "100%", maxWidth: 420, padding: "2.5rem", borderRadius: "1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
        <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Check your inbox
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.7 }}>
          We&apos;ve sent a verification link to your email address. Click the link
          to activate your account.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "1.5rem" }}>
          Didn&apos;t get it? Check your spam folder, or{" "}
          <a href="/register" style={{ color: "hsl(217 70% 47%)", textDecoration: "none" }}>
            try again
          </a>.
        </p>
      </div>
    </div>
  );
}
