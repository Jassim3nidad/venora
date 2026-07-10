import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white font-sans text-zinc-900 antialiased">
      <main className="w-full flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
