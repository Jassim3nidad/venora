"use client";

import type { ReactNode } from "react";
import { EnterpriseShell } from "@/components/dashboard/enterprise";

export default function CoordinatorDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <EnterpriseShell role="coordinator">{children}</EnterpriseShell>;
}
