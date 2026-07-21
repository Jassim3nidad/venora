import type { ReactNode } from "react";
import StorefrontNavbar from "@/features/storefront/ui/StorefrontNavbar";
import StorefrontFooter from "@/features/storefront/ui/StorefrontFooter";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-base font-sans text-text-primary antialiased">
      <StorefrontNavbar />
      <main className="w-full flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  );
}
