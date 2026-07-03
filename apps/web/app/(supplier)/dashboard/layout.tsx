"use client";

import type { ReactNode } from "react";
import { EnterpriseShell } from "@/components/dashboard/enterprise";

export default function SupplierDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <EnterpriseShell role="supplier">{children}</EnterpriseShell>;
}
