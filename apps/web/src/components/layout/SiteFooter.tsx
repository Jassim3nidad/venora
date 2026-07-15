"use client";

import Link from "next/link";
import { Globe } from "lucide-react";
import { Separator } from "@venora/ui";

const FOOTER_LINKS = {
  Support: [
    { label: "Help Center", href: "/help" },
    { label: "Safety Information", href: "/safety" },
    { label: "Cancellation Options", href: "/cancellation-options" },
  ],
  Hosting: [
    { label: "Venora your home", href: "/account/become-partner" },
    { label: "Cover for Hosts", href: "/host-protection" },
    { label: "Hosting Resources", href: "/hosting-resources" },
  ],
  Venora: [
    { label: "Newsroom", href: "/newsroom" },
    { label: "New Features", href: "/features" },
    { label: "Careers", href: "/careers" },
  ],
} as const;

export function SiteFooter() {
  return (
    <footer className="w-full shrink-0 border-t border-zinc-200 bg-zinc-50 px-6 pb-12 pt-14 text-sm text-zinc-600 md:px-20">
      <div className="mx-auto w-full max-w-[1600px] space-y-12">
        <div className="grid gap-8 sm:grid-cols-3">
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} className="space-y-4">
              <h6 className="font-semibold tracking-tight text-zinc-800">
                {title}
              </h6>
              <ul className="space-y-2 text-[13px] text-zinc-500">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition-all hover:text-[#2563EB] hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-zinc-200" />

        <div className="flex flex-col-reverse items-center justify-between gap-4 text-xs text-zinc-500 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>{new Date().getFullYear()} Venora, Inc.</span>
            <span aria-hidden="true">.</span>
            <Link
              href="/privacy"
              className="font-semibold hover:text-[#2563EB]"
            >
              Privacy
            </Link>
            <span aria-hidden="true">.</span>
            <Link href="/terms" className="font-semibold hover:text-[#2563EB]">
              Terms
            </Link>
          </div>

          <div className="flex items-center gap-4 font-semibold text-zinc-700">
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              English (PH)
            </span>
            <span>PHP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
