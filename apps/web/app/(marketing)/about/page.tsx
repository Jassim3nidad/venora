import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Bot,
  BrainCircuit,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Handshake,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import {
  RevealGroup,
  RevealItem,
  ScrollReveal,
  ScrollRevealGroup,
} from "@/src/components/animations/RevealAnimations";

export const metadata: Metadata = { title: "About Venora" };

type RolePanel = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type Transformation = {
  problem: string;
  solution: string;
};

type JourneyStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type TrustPoint = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const roles: RolePanel[] = [
  {
    title: "Customers",
    description:
      "Discover venues and trusted event services without jumping across scattered pages and messages.",
    icon: UsersRound,
  },
  {
    title: "Venue owners",
    description:
      "Manage listings, packages, availability, bookings, and venue teams from one marketplace surface.",
    icon: Building2,
  },
  {
    title: "Event suppliers",
    description:
      "Showcase services and receive qualified inquiries from customers already planning an event.",
    icon: Store,
  },
];

const transformations: Transformation[] = [
  {
    problem:
      "Venue information is scattered across posts, referrals, social pages, and private messages.",
    solution:
      "Venora brings profile details, photos, capacity, location, amenities, packages, and policies into one venue page.",
  },
  {
    problem:
      "Customers spend too much time asking for availability, pricing, and inclusions before they can decide.",
    solution:
      "Structured venue profiles and booking requests help customers compare options and help venues respond with context.",
  },
  {
    problem:
      "Venue owners and suppliers often receive incomplete inquiries that are hard to organize and follow up.",
    solution:
      "Dashboard tools keep requests, calendars, supplier inquiries, and next steps easier for business teams to manage.",
  },
];

const journeySteps: JourneyStep[] = [
  {
    title: "Discover",
    description: "Search by location, event type, capacity, and venue style.",
    icon: Search,
  },
  {
    title: "Compare",
    description: "Review photos, inclusions, policies, pricing, and amenities.",
    icon: ClipboardList,
  },
  {
    title: "Check availability",
    description:
      "Plan around venue calendars and booking status with confidence.",
    icon: CalendarCheck,
  },
  {
    title: "Request",
    description:
      "Send structured booking requests with the details venues need.",
    icon: MessageCircle,
  },
  {
    title: "Coordinate",
    description:
      "Connect with venue teams and suppliers as the plan takes shape.",
    icon: Handshake,
  },
  {
    title: "Confirm",
    description:
      "Track booking status, next steps, and event readiness in one place.",
    icon: CheckCircle2,
  },
];

const trustPoints: TrustPoint[] = [
  {
    title: "Verified venue listings",
    description:
      "Venue profiles are designed to show the essentials customers need before booking.",
    icon: BadgeCheck,
  },
  {
    title: "Transparent booking",
    description:
      "Structured requests make expectations clearer for customers and venue teams.",
    icon: ShieldCheck,
  },
  {
    title: "Accredited suppliers",
    description:
      "Supplier profiles help customers connect with trusted event service providers.",
    icon: Store,
  },
  {
    title: "Reviews and ratings",
    description:
      "Customer feedback helps future planners make more confident decisions.",
    icon: Sparkles,
  },
];

const discoveryPreview = [
  "Garden venue in Tagaytay for 150 guests",
  "Recommended venues by capacity, setting, and budget",
  "Compare packages, inclusions, and booking signals",
  "Estimate likely costs before starting conversations",
];

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
  light?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p
        className={[
          "text-xs font-bold uppercase",
          light ? "text-blue-100" : "text-[#2563EB]",
        ].join(" ")}
      >
        {eyebrow}
      </p>
      <h2
        className={[
          "mt-3 text-3xl font-bold leading-tight sm:text-4xl",
          light ? "text-white" : "text-[#111827]",
        ].join(" ")}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={[
            "mt-4 text-base font-medium leading-7",
            light ? "text-blue-50" : "text-[#4B5563]",
          ].join(" ")}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function RolePanelCard({ role }: { role: RolePanel }) {
  const Icon = role.icon;

  return (
    <div className="h-full rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/50 transition duration-200 ease-out hover:-translate-y-px hover:border-[#BFDBFE] hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#111827]">{role.title}</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-[#4B5563]">
            {role.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function TrustPointCard({ point }: { point: TrustPoint }) {
  const Icon = point.icon;

  return (
    <div className="rounded-lg border border-[#DDE7F7] bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-[#111827]">{point.title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-[#5B6678]">
        {point.description}
      </p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F6F8FB] text-[#111827] antialiased">
      <MarketingNavbar />

      <main className="w-full flex-grow">
        <section className="relative isolate overflow-hidden bg-slate-950">
          <Image
            src="/images/about/about-hero-background.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/88 via-slate-950/62 to-slate-950/32"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 -z-10 h-36 bg-gradient-to-t from-white via-white/55 to-transparent"
            aria-hidden="true"
          />
          <RevealGroup
            className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8 lg:py-20"
            staggerDelay={0.08}
          >
            <div className="min-w-0">
              <RevealItem yOffset={8}>
                <p className="text-sm font-bold text-blue-100">About Venora</p>
              </RevealItem>
              <RevealItem yOffset={12}>
                <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-[3.4rem]">
                  Planning an event should feel exciting, not overwhelming.
                </h1>
              </RevealItem>
              <RevealItem yOffset={12}>
                <p className="mt-5 max-w-xl text-base font-medium leading-7 text-blue-50 sm:text-lg">
                  Venora brings customers, venue owners, and event suppliers
                  together in one platform, making it easier to discover venues,
                  coordinate services, and manage every stage of an event.
                </p>
              </RevealItem>
              <RevealItem yOffset={16}>
                <a
                  href="#how-venora-works"
                  className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition duration-200 ease-out hover:-translate-y-px hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                >
                  Explore how Venora works
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </a>
              </RevealItem>
            </div>

            <RevealItem yOffset={16}>
              <div className="relative overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] shadow-lg shadow-slate-200/60">
                <Image
                  src="/images/about/wedding-venue-table.jpg"
                  alt="Wedding reception table inside a bright venue."
                  width={1600}
                  height={1067}
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="aspect-[4/3] w-full object-cover transition duration-500 ease-out hover:scale-[1.02]"
                />
                <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white/92 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-bold text-[#111827]">
                    One marketplace for venues, suppliers, and booking clarity.
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#4B5563]">
                    Built for customers planning events and businesses managing
                    them.
                  </p>
                </div>
              </div>
            </RevealItem>
          </RevealGroup>
        </section>

        <section className="border-b border-[#E5E7EB] bg-white py-12 sm:py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal yOffset={12}>
              <SectionHeading
                eyebrow="Ecosystem"
                title="Who Venora connects"
                description="Venora creates a more connected experience for everyone involved in planning and delivering an event."
                centered
              />
            </ScrollReveal>

            <ScrollRevealGroup
              className="mt-8 grid gap-4 md:grid-cols-3"
              staggerDelay={0.07}
            >
              {roles.map((role) => (
                <RevealItem key={role.title} yOffset={12}>
                  <RolePanelCard role={role} />
                </RevealItem>
              ))}
            </ScrollRevealGroup>
          </div>
        </section>

        <section className="bg-[#F6F8FB] py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal yOffset={12}>
              <SectionHeading
                eyebrow="The transformation"
                title="From scattered planning to clearer decisions"
                description="The problem and solution belong side by side: every pain point in the old planning flow maps to a cleaner Venora workflow."
                centered
              />
            </ScrollReveal>

            <div className="mt-10 grid gap-4">
              {transformations.map((item, index) => (
                <ScrollReveal
                  key={item.problem}
                  yOffset={12}
                  className="grid gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/50 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch md:p-5"
                >
                  <div className="rounded-lg bg-[#F8FAFC] p-4">
                    <p className="text-xs font-bold uppercase text-[#9CA3AF]">
                      Planning friction {index + 1}
                    </p>
                    <p className="mt-2 text-base font-bold leading-7 text-[#111827]">
                      {item.problem}
                    </p>
                  </div>
                  <div className="hidden items-center px-1 text-[#2563EB] md:flex">
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                    <p className="text-xs font-bold uppercase text-[#1D4ED8]">
                      Venora response
                    </p>
                    <p className="mt-2 text-base font-bold leading-7 text-[#1F2937]">
                      {item.solution}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-venora-works"
          className="scroll-mt-28 bg-[#EAF2FF] py-14 sm:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal yOffset={12}>
              <SectionHeading
                eyebrow="How Venora works"
                title="A guided journey from discovery to confirmation"
                description="The marketplace is designed around the way people actually plan events: search, compare, ask, coordinate, and confirm."
                centered
              />
            </ScrollReveal>

            <ScrollRevealGroup
              className="relative mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6"
              staggerDelay={0.07}
            >
              {journeySteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <RevealItem key={step.title} yOffset={14}>
                    <div className="h-full rounded-lg border border-[#C7DAF5] bg-white p-4 shadow-sm shadow-blue-100/60">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-[#2563EB]">
                          0{index + 1}
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-[#111827]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-[#4B5563]">
                        {step.description}
                      </p>
                    </div>
                  </RevealItem>
                );
              })}
            </ScrollRevealGroup>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8">
            <ScrollReveal yOffset={16} className="min-h-full">
              <div className="h-full overflow-hidden rounded-lg">
                <Image
                  src="/images/about/outdoor-wedding-reception.jpg"
                  alt="Outdoor wedding reception arranged for guests."
                  width={1600}
                  height={1067}
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="h-full min-h-[320px] w-full object-cover transition duration-500 ease-out hover:scale-[1.02]"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal
              yOffset={16}
              className="flex min-h-full flex-col justify-center rounded-lg bg-[#F8FAFC] p-6 sm:p-8 lg:p-10"
            >
              <p className="text-xs font-bold uppercase text-[#2563EB]">
                Mission and vision
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-[#111827] sm:text-4xl">
                Make venue booking trusted, intelligent, and easier to act on.
              </h2>
              <p className="mt-5 text-base font-medium leading-7 text-[#374151]">
                Venora exists to transform the venue booking experience by
                creating a trusted platform that connects customers with
                outstanding venues and event services.
              </p>
              <p className="mt-4 text-base font-medium leading-7 text-[#4B5563]">
                The vision is to become a leading AI-powered venue marketplace
                in the Philippines and Southeast Asia while keeping the planning
                experience human, credible, and practical.
              </p>
            </ScrollReveal>
          </div>
        </section>

        <section className="bg-[#F6F8FB] py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal yOffset={12}>
              <SectionHeading
                eyebrow="Trust"
                title="Credibility at the moments that matter"
                description="Venora is designed to make discovery clearer for customers and marketplace operations easier for event businesses."
                centered
              />
            </ScrollReveal>
            <ScrollRevealGroup
              className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              staggerDelay={0.07}
            >
              {trustPoints.map((point) => (
                <RevealItem key={point.title} yOffset={12}>
                  <TrustPointCard point={point} />
                </RevealItem>
              ))}
            </ScrollRevealGroup>
          </div>
        </section>

        <section className="bg-[#172554] py-14 text-white sm:py-20">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:px-8">
            <ScrollReveal yOffset={12} className="min-w-0">
              <SectionHeading
                eyebrow="Intelligent discovery"
                title="Search that understands the planning context"
                description="Venora helps users search naturally, compare options, and discover venues based on event type, budget, guest count, location, and preferences."
                light
              />
            </ScrollReveal>

            <ScrollReveal yOffset={16} className="min-w-0">
              <div className="rounded-lg border border-white/15 bg-white/8 p-4 shadow-xl shadow-blue-950/30">
                <div className="rounded-lg bg-white p-4 text-[#111827]">
                  <div className="flex items-center gap-3 rounded-lg border border-[#DBEAFE] bg-[#F8FAFC] px-4 py-3">
                    <Search className="h-5 w-5 shrink-0 text-[#2563EB]" />
                    <p className="min-w-0 truncate text-sm font-bold text-[#4B5563]">
                      Garden venue in Tagaytay for 150 guests under budget
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {discoveryPreview.map((item, index) => (
                      <div
                        key={item}
                        className="rounded-lg border border-[#E5E7EB] bg-white p-4"
                      >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                          {index === 0 ? (
                            <Bot className="h-4 w-4" aria-hidden="true" />
                          ) : index === 1 ? (
                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                          ) : index === 2 ? (
                            <WalletCards
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          ) : (
                            <BrainCircuit
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <p className="text-sm font-bold leading-6 text-[#111827]">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal
              yOffset={12}
              className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
            >
              <SectionHeading
                eyebrow="Marketplace ecosystem"
                title="More than a venue directory"
                description="Venora connects the people and businesses behind every event, from the first search to venue booking, supplier inquiry, and the final guest experience."
              />
              <div className="grid gap-3">
                {[
                  "Customers discover venues and send booking requests.",
                  "Venue teams manage listings, packages, calendars, and bookings.",
                  "Suppliers receive relevant inquiries from event customers.",
                  "Coordinators and administrators keep operations organized.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                    <p className="text-sm font-bold leading-6 text-[#374151]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="bg-[#F6F8FB] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <ScrollReveal
            yOffset={16}
            className="mx-auto max-w-7xl rounded-lg bg-[#2563EB] p-7 text-center text-white shadow-lg shadow-[#2563EB]/20 sm:p-10 lg:p-12"
          >
            <p className="text-xs font-bold uppercase text-blue-100">
              Start with Venora
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
              Start planning your next event with Venora.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-blue-50">
              Explore venues, compare options, and connect with the event
              partners who can help bring your plans to life.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/venues"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-7 text-sm font-bold text-[#1D4ED8] transition duration-200 ease-out hover:-translate-y-px hover:bg-[#EFF6FF]"
              >
                Browse Venues
              </Link>
              <Link
                href="/account/become-partner"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/35 px-7 text-sm font-bold text-white transition duration-200 ease-out hover:-translate-y-px hover:bg-white/10"
              >
                Become a Venue Partner
              </Link>
            </div>
          </ScrollReveal>
        </section>
      </main>
    </div>
  );
}
