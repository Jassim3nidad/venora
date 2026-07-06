import type { Metadata } from "next";
import {
  Clock,
  Database,
  Lock,
  Megaphone,
  Share2,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy and Sharing",
};

const PREFERENCE_ROWS = [
  {
    label: "Marketing communications",
    description:
      "Receive emails about new venues, promotions, and Venora updates.",
    icon: Megaphone,
  },
  {
    label: "Personalized recommendations",
    description:
      "Use your browsing and booking activity to suggest better venue matches.",
    icon: Sparkles,
  },
  {
    label: "Data sharing with venues",
    description:
      "Share your booking details with venues to help them prepare for your event.",
    icon: Share2,
  },
];

const DATA_ROWS = [
  {
    label: "Request a copy of your data",
    description:
      "Download an export of the personal information Venora has on file.",
    icon: Database,
  },
  {
    label: "Delete your account",
    description:
      "Permanently remove your profile, bookings, and saved venues.",
    icon: Lock,
  },
];

function ComingSoonBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
      <Clock className="h-3 w-3" />
      Coming soon
    </span>
  );
}

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
            <Lock className="h-5 w-5" />
          </div>

          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            Privacy and sharing
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Communication and data preferences
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Fine-grained privacy controls are on the way. For now, here&apos;s
            what you&apos;ll be able to manage from this page.
          </p>
        </div>

        <div className="divide-y divide-[#E5E7EB]/80">
          {PREFERENCE_ROWS.map((row) => {
            const Icon = row.icon;

            return (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 p-6 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#2563EB]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950">
                      {row.label}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-500">
                      {row.description}
                    </p>
                  </div>
                </div>

                <ComingSoonBadge />
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            Account data
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
            Manage your data
          </h2>
        </div>

        <div className="divide-y divide-[#E5E7EB]/80">
          {DATA_ROWS.map((row) => {
            const Icon = row.icon;

            return (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 p-6 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#2563EB]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950">
                      {row.label}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-500">
                      {row.description}
                    </p>
                  </div>
                </div>

                <ComingSoonBadge />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
