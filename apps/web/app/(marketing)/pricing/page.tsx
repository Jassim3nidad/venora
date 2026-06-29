import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing" };

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    description: "For small venues just getting started.",
    features: ["Up to 3 listings", "Basic analytics", "Email support"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "₱1,999/mo",
    description: "For growing venues and event operators.",
    features: [
      "Unlimited listings",
      "Advanced analytics",
      "Calendar management",
      "Staff accounts",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large venue networks and corporations.",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "White-label option",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <main className="container" style={{ paddingBlock: "5rem" }}>
      <h1
        style={{
          fontFamily: "var(--font-sora, sans-serif)",
          fontSize: "2.5rem",
          fontWeight: 700,
          textAlign: "center",
          marginBottom: "0.5rem",
        }}
      >
        Simple, Transparent Pricing
      </h1>
      <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "3rem" }}>
        No hidden fees. Cancel anytime.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            style={{
              padding: "2rem",
              borderRadius: "1rem",
              border: plan.highlighted
                ? "2px solid hsl(217 70% 47%)"
                : "1px solid var(--border-default)",
              background: plan.highlighted ? "hsl(217 70% 47% / 0.05)" : "var(--bg-subtle)",
              position: "relative",
            }}
          >
            {plan.highlighted && (
              <span
                style={{
                  position: "absolute",
                  top: "-0.75rem",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "hsl(217 70% 47%)",
                  color: "#fff",
                  padding: "0.2rem 1rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Most Popular
              </span>
            )}
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>{plan.name}</h2>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "hsl(217 70% 47%)", margin: "0.75rem 0" }}>
              {plan.price}
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {plan.description}
            </p>
            <ul style={{ listStyle: "none", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <span style={{ color: "hsl(217 70% 47%)" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a
              href="/register"
              style={{
                display: "block",
                textAlign: "center",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                background: plan.highlighted ? "hsl(217 70% 47%)" : "transparent",
                border: plan.highlighted ? "none" : "1px solid var(--border-strong)",
                color: plan.highlighted ? "#fff" : "var(--text-primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
