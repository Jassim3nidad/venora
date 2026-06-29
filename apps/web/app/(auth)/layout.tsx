import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, hsl(217 50% 10%) 0%, hsl(240 30% 8%) 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Back to home */}
      <div style={{ padding: "1.25rem 2rem" }}>
        <Link
          href="/"
          id="auth-back-home"
          style={{
            fontFamily: "var(--font-sora, sans-serif)",
            fontWeight: 700,
            fontSize: "1.25rem",
            textDecoration: "none",
            background: "linear-gradient(135deg, hsl(217 80% 63%), hsl(45 96% 54%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Venora
        </Link>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}
