import type { ReactNode } from "react";
import { Separator } from "@venora/ui";
import { Globe } from "lucide-react";

const FOOTER_LINKS = {
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Safety Information", href: "#" },
    { label: "Cancellation Options", href: "#" },
  ],
  Hosting: [
    { label: "Venora your home", href: "#" },
    { label: "Cover for Hosts", href: "#" },
    { label: "Hosting Resources", href: "#" },
  ],
  Venora: [
    { label: "Newsroom", href: "#" },
    { label: "New Features", href: "#" },
    { label: "Careers", href: "#" },
  ],
};

// Notice: Removed 'async' — this is now a pure, blazing-fast layout shell
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 font-sans antialiased w-full">
      
      {/* Page content gets injected right at the very top of the browser! */}
      <main className="flex-1 w-full">{children}</main>

      {/* ─── Clean Site Footer stays pinned to the bottom ─── */}
      <footer className="border-t border-zinc-200 bg-zinc-50 px-6 md:px-20 pb-12 pt-14 text-sm text-zinc-600 w-full mt-auto">
        <div className="mx-auto max-w-[1600px] space-y-12 w-full">
          <div className="grid gap-8 sm:grid-cols-3">
            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title} className="space-y-4">
                <h6 className="font-semibold text-zinc-800 tracking-tight">{title}</h6>
                <ul className="space-y-2 text-[13px] text-zinc-500">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:underline transition-all">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator className="bg-zinc-200" />
          <div className="flex flex-col-reverse items-center justify-between gap-4 text-xs text-zinc-500 md:flex-row">
            <div>© {new Date().getFullYear()} Venora, Inc. · Privacy · Terms</div>
            <div className="flex items-center gap-4 font-semibold text-zinc-700">
              <span className="flex items-center gap-1 cursor-pointer"><Globe className="h-3.5 w-3.5"/> English (PH)</span>
              <span>₱ PHP</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}