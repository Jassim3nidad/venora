"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = () => {
    router.push("/logout");
  };

  return (
    <button
      id="dashboard-signout-btn"
      onClick={handleSignOut}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.625rem 0.875rem",
        borderRadius: "0.5rem",
        border: "none",
        background: "transparent",
        color: "#EF4444",
        fontSize: "0.875rem",
        fontWeight: 600,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <LogOut size={15} />
      Sign Out
    </button>
  );
}
