import type { ReactNode } from "react";
import Link from "next/link";
import "../globals.css";

const NAV = [
  { href: "/venues",    label: "Browse Venues", icon: "🏛️" },
  { href: "/bookings",  label: "My Bookings",   icon: "📅" },
  { href: "/favorites", label: "Favourites",    icon: "❤️" },
  { href: "/account",   label: "Account",       icon: "👤" },
];

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="glass" style={{ position: "sticky", top: 0, zIndex: 40, height: "4rem", display: "flex", alignItems: "center", borderBottom: "1px solid var(--border-default)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontFamily: "var(--font-sora, sans-serif)", fontWeight: 700, fontSize: "1.375rem", textDecoration: "none",
            background: "linear-gradient(135deg, hsl(217 80% 63%), hsl(45 96% 54%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Venora
          </Link>
          <nav style={{ display: "flex", gap: "1.5rem" }}>
            {NAV.map(({ href, label, icon }) => (
              <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
                <span>{icon}</span> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
