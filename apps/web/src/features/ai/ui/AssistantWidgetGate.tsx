"use client";

import { usePathname } from "next/navigation";
import AssistantWidget from "./AssistantWidget";

const excludedPrefixes = [
  "/dashboard",
  "/admin",
  "/login",
  "/register",
  "/reset-password",
  "/forgot-password",
  "/verify-email",
];

export default function AssistantWidgetGate() {
  const pathname = usePathname() ?? "";
  const isExcluded = excludedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isExcluded) return null;
  return <AssistantWidget />;
}
