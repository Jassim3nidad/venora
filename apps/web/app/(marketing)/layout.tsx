import type { ReactNode } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/venues",  label: "Browse Venues" },
  { href: "/about",   label: "About" },
  { href: "/pricing", label: "Pricing" },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header
        className="glass"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: "4rem",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgb(255 255 255 / 0.1)",
        }}
      >
        <nav
          className="container"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}
        >
          <Link
            href="/"
            id="nav-logo"
            style={{
              fontFamily: "var(--font-sora, sans-serif)",
              fontWeight: 700,
              fontSize: "1.5rem",
              textDecoration: "none",
              background: "linear-gradient(135deg, hsl(217 80% 63%), hsl(45 96% 54%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Venora
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              id="nav-login-btn"
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "0.625rem",
                background: "hsl(217 70% 47%)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      <div style={{ paddingTop: "4rem" }}>{children}</div>

      <footer
        style={{
          borderTop: "1px solid var(--border-default)",
          padding: "2rem 1.5rem",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.875rem",
        }}
      >
        © {new Date().getFullYear()} Venora. All rights reserved.
      </footer>
    </>
  );
}
