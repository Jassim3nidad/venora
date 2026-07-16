import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  BadgeCheck,
  Bot,
  BrainCircuit,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  MessageCircle,
  Search,
  Sparkles,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import MarketingNavbar from "@/components/layout/MarketingNavbar";

export const metadata: Metadata = { title: "About Venora" };

type Card = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const problems: Card[] = [
  {
    title: "Scattered venue information",
    description:
      "Customers often jump between social pages, messages, posts, and referrals just to build a shortlist.",
    icon: Search,
  },
  {
    title: "Manual inquiries",
    description:
      "Availability, package details, and pricing can take too many conversations before planning can move forward.",
    icon: MessageCircle,
  },
  {
    title: "Hard-to-compare options",
    description:
      "Different formats make it difficult to compare venues, suppliers, budgets, and booking readiness.",
    icon: ClipboardList,
  },
];

const solutions: Card[] = [
  {
    title: "Discover venues",
    description:
      "Browse venue profiles by location, event type, capacity, and style.",
    icon: Search,
  },
  {
    title: "Compare packages",
    description:
      "Review pricing, inclusions, capacities, and policies in one place.",
    icon: WalletCards,
  },
  {
    title: "Check availability",
    description:
      "Plan around venue calendars and booking status with more confidence.",
    icon: CalendarCheck,
  },
  {
    title: "Submit booking requests",
    description:
      "Send structured requests that help venues respond with the right details.",
    icon: CheckCircle2,
  },
  {
    title: "Connect with suppliers",
    description:
      "Find event professionals who can support the full experience.",
    icon: Store,
  },
  {
    title: "Track booking status",
    description:
      "Keep requests, confirmations, and next steps easier to follow.",
    icon: LayoutDashboard,
  },
];

const connectedRoles: Card[] = [
  {
    title: "Customers",
    description:
      "Discover venues and trusted event services in one place.",
    icon: UsersRound,
  },
  {
    title: "Venue owners",
    description:
      "Manage listings, availability, packages, and bookings with modern tools.",
    icon: Building2,
  },
  {
    title: "Event suppliers",
    description:
      "Showcase services and receive qualified event inquiries.",
    icon: Store,
  },
];

const trustItems: Card[] = [
  {
    title: "Verified venue listings",
    description:
      "Venue profiles are built to show the details customers need before booking.",
    icon: BadgeCheck,
  },
  {
    title: "AI-powered search",
    description:
      "Search naturally by event needs, location, guest count, budget, and preferences.",
    icon: BrainCircuit,
  },
  {
    title: "Transparent booking process",
    description:
      "Structured requests make expectations clearer for customers and venue teams.",
    icon: ClipboardList,
  },
  {
    title: "Accredited suppliers",
    description:
      "Supplier profiles help customers connect with trusted event service providers.",
    icon: Handshake,
  },
  {
    title: "Business tools for owners",
    description:
      "Owners get modern tools for profiles, calendars, bookings, packages, and teams.",
    icon: LayoutDashboard,
  },
  {
    title: "Reviews and ratings",
    description:
      "Customer feedback helps future planners make more confident decisions.",
    icon: Sparkles,
  },
];

const aiFeatures: Card[] = [
  {
    title: "AI venue recommendations",
    description:
      "Match event needs with venues that fit the occasion and planning context.",
    icon: Sparkles,
  },
  {
    title: "Smart search",
    description:
      "Search by budget, guest count, event type, location, and preferences.",
    icon: Search,
  },
  {
    title: "Package comparison",
    description:
      "Review venue options and package details without losing the planning thread.",
    icon: WalletCards,
  },
  {
    title: "Cost estimation",
    description:
      "Understand likely costs earlier so planning conversations stay grounded.",
    icon: WalletCards,
  },
  {
    title: "Customer assistant",
    description:
      "Guide customers toward relevant venues, suppliers, and next steps.",
    icon: Bot,
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base font-medium leading-7 text-[#6B7280]">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({ item }: { item: Card }) {
  const Icon = item.icon;

  return (
    <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 transition hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-xl hover:shadow-slate-200/70">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-black tracking-[-0.03em] text-[#111827]">
        {item.title}
      </h3>
      <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
        {item.description}
      </p>
    </div>
  );
}

function VenoraEcosystemVisual() {
  const roles = [
    {
      title: "Customers",
      description: "Find venues and event services.",
      icon: UsersRound,
      className: "lg:col-start-2 lg:row-start-1",
    },
    {
      title: "Venue owners",
      description: "Manage venues and bookings.",
      icon: Building2,
      className: "lg:col-start-1 lg:row-start-2",
    },
    {
      title: "Event suppliers",
      description: "Offer services and receive inquiries.",
      icon: Store,
      className: "col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-2",
    },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-[#DBEAFE] bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6"
      aria-label="Venora connects customers, venue owners, and event suppliers."
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(191,219,254,0.42),_transparent_30%)]"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-28 left-1/2 top-36 hidden w-px -translate-x-1/2 bg-[#BFDBFE] lg:block"
        aria-hidden="true"
      />
      <div
        className="absolute left-[18%] right-[18%] top-[62%] hidden h-px bg-[#BFDBFE] lg:block"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
              Venora ecosystem
            </p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-[#111827]">
              One place for event planning to connect.
            </h2>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:items-center">
          <div className="relative z-10 col-span-2 rounded-[24px] border border-[#BFDBFE] bg-[#EFF6FF] p-4 shadow-sm shadow-blue-100/70 lg:col-span-1 lg:col-start-2 lg:row-start-2">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-white">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-[-0.03em] text-[#111827]">
                  Venora
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#4B5563]">
                  One platform for venues, services, and event coordination.
                </p>
              </div>
            </div>
          </div>

          {roles.map((role) => {
            const Icon = role.icon;

            return (
              <div
                key={role.title}
                className={[
                  "relative z-10 rounded-[22px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/60",
                  role.className,
                ].join(" ")}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#2563EB] ring-1 ring-[#DBEAFE]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-black tracking-[-0.03em] text-[#111827]">
                  {role.title}
                </h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[#6B7280]">
                  {role.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F9FAFB] text-[#111827] antialiased">
      <MarketingNavbar />

      <main className="w-full flex-grow">
        <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-gradient-to-br from-white via-[#F8FAFC] to-[#EFF6FF] py-12 sm:py-14 lg:py-16">
          <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-[#DBEAFE]/50 blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#2563EB]">
                About Venora
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-[-0.045em] text-[#111827] sm:text-5xl lg:text-[3.5rem]">
                Planning an event should feel exciting, not overwhelming.
              </h1>
              <p className="mt-6 max-w-xl text-base font-medium leading-7 text-[#4B5563] sm:text-lg">
                Venora brings customers, venue owners, and event suppliers together in one platform—making it easier to discover venues, coordinate services, and manage every stage of an event.
              </p>
              <a
                href="#how-venora-works"
                className="mt-8 inline-flex h-11 w-fit items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-white px-5 text-sm font-extrabold text-[#1D4ED8] shadow-sm transition hover:bg-[#EFF6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
              >
                Explore how Venora works
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <VenoraEcosystemVisual />
          </div>
        </section>

        <section
          id="how-venora-works"
          className="scroll-mt-28 bg-white py-12 sm:py-16"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Ecosystem"
              title="Who Venora connects"
              description="Venora creates a more connected experience for everyone involved in planning and delivering an event."
              centered
            />
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {connectedRoles.map((item) => (
                <FeatureCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The problem"
              title="Event venue discovery should not be difficult."
              description="Planning an event should feel exciting, not scattered. Venora brings venue details, packages, suppliers, and booking steps into a cleaner discovery experience."
              centered
            />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {problems.map((item) => (
                <FeatureCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <SectionHeading
                eyebrow="The solution"
                title="A smarter way to discover and book venues."
                description="Venora turns the venue search into a guided marketplace experience where customers can compare options and venue teams can respond with better context."
              />
              <div className="grid gap-5 sm:grid-cols-2">
                {solutions.map((item) => (
                  <FeatureCard key={item.title} item={item} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="rounded-[28px] border border-[#DBEAFE] bg-[#EFF6FF] p-6 shadow-sm shadow-slate-200/60 sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                Mission
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827]">
                Make venue booking trusted and intelligent.
              </h2>
              <p className="mt-4 text-base font-medium leading-7 text-[#4B5563]">
                To transform the venue booking experience by creating a trusted
                and intelligent platform that connects customers with
                outstanding venues and event services.
              </p>
            </div>
            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                Vision
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827]">
                Lead AI-powered event discovery in the region.
              </h2>
              <p className="mt-4 text-base font-medium leading-7 text-[#6B7280]">
                To become the leading AI-powered venue marketplace in the
                Philippines and Southeast Asia.
              </p>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Why choose Venora"
              title="Trust-building tools for every side of the booking."
              description="Venora is designed to make venue discovery clearer for customers and marketplace operations easier for businesses."
              centered
            />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trustItems.map((item) => (
                <FeatureCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="rounded-[32px] bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] p-7 text-white shadow-xl shadow-[#2563EB]/20 sm:p-9">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Powered by intelligent event discovery
              </h2>
              <p className="mt-4 text-base font-medium leading-7 text-blue-50">
                Venora helps users search naturally, compare options, and
                discover venues based on event type, budget, guest count,
                location, and preferences.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {aiFeatures.map((item) => (
                <FeatureCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[32px] border border-[#DBEAFE] bg-white shadow-xl shadow-slate-200/60">
              <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="bg-[#EFF6FF] p-6 sm:p-8 lg:p-10">
                  <SectionHeading
                    eyebrow="Marketplace ecosystem"
                    title="More than a venue directory"
                    description="Venora connects the people and businesses behind every event, from the first search to venue booking, supplier inquiry, and the final guest experience."
                  />
                </div>
                <div className="grid gap-4 p-6 sm:p-8 lg:p-10">
                  {[
                    "Customers discover and request venues.",
                    "Venue teams manage listings, packages, calendars, and bookings.",
                    "Suppliers receive relevant inquiries from event customers.",
                    "Coordinators and administrators keep operations organized.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                      <p className="text-sm font-semibold leading-6 text-[#374151]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[32px] bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] p-7 text-center text-white shadow-2xl shadow-[#2563EB]/20 sm:p-10 lg:p-14">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-100">
              Start with Venora
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Start planning your next event with Venora.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-blue-50">
              Explore venues, compare options, and connect with the event
              partners who can help bring your plans to life.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/venues"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-extrabold text-[#1D4ED8] transition hover:bg-[#EFF6FF]"
              >
                Browse Venues
              </Link>
              <Link
                href="/account/become-partner"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/30 px-7 text-sm font-extrabold text-white transition hover:bg-white/10"
              >
                Become a Venue Partner
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
