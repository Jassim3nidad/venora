import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";

type InfoPageCard = {
  title: string;
  description: string;
};

type InfoPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  cards: InfoPageCard[];
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  note?: string;
  includeFooter?: boolean;
};

export function InfoPageShell({
  eyebrow,
  title,
  description,
  cards,
  ctaLabel = "Browse Venues",
  ctaHref = "/venues",
  secondaryCtaLabel = "Learn About Venora",
  secondaryCtaHref = "/about",
  note,
  includeFooter = false,
}: InfoPageShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F9FAFB] text-[#111827] antialiased">
      <MarketingNavbar />

      <div className="w-full flex-grow">
        <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-gradient-to-br from-white via-[#EFF6FF] to-white py-16 sm:py-20 lg:py-24">
          <div className="absolute left-1/2 top-8 h-64 w-64 -translate-x-1/2 rounded-full bg-[#BFDBFE]/35 blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-white/85 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-[-0.05em] text-[#111827] sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-[#4B5563] sm:text-lg">
                {description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={ctaHref}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-7 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
                >
                  {ctaLabel}
                </Link>
                <Link
                  href={secondaryCtaHref}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#BFDBFE] bg-white px-7 text-sm font-extrabold text-[#1D4ED8] shadow-sm transition hover:bg-[#EFF6FF]"
                >
                  {secondaryCtaLabel}
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#DBEAFE] bg-white/90 p-5 shadow-2xl shadow-slate-200/70">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                Venora guide
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#111827]">
                Quick overview
              </h2>
              <div className="mt-5 grid gap-3">
                {cards.slice(0, 3).map((card) => (
                  <div
                    key={card.title}
                    className="flex items-start gap-3 rounded-2xl bg-[#EFF6FF] p-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                    <p className="text-sm font-bold leading-6 text-[#1F2937]">
                      {card.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 transition hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-xl hover:shadow-slate-200/70"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-black tracking-[-0.03em] text-[#111827]">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                    {card.description}
                  </p>
                </article>
              ))}
            </div>

            {note ? (
              <div className="mt-8 rounded-[28px] border border-[#DBEAFE] bg-[#EFF6FF] p-6 shadow-sm shadow-slate-200/60 sm:p-8">
                <p className="max-w-4xl text-sm font-semibold leading-7 text-[#1F2937]">
                  {note}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[32px] bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] p-7 text-center text-white shadow-2xl shadow-[#2563EB]/20 sm:p-10 lg:p-12">
            <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Keep planning with Venora.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-blue-50">
              Explore venues, compare event options, and manage your next steps
              with a marketplace built for modern celebrations.
            </p>
            <Link
              href="/venues"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-7 text-sm font-extrabold text-[#1D4ED8] transition hover:bg-[#EFF6FF]"
            >
              Browse Venues
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>

      {includeFooter ? <SiteFooter /> : null}
    </div>
  );
}
