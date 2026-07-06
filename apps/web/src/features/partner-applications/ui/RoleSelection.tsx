import { Building2, Truck, ClipboardCheck } from "lucide-react";
import { useState } from "react";

const ROLES = [
  { value: "venue_owner", label: "Venue Owner", icon: Building2, desc: "List and manage your event spaces." },
  { value: "event_coordinator", label: "Event Coordinator", icon: ClipboardCheck, desc: "Manage clients and plan events." },
  { value: "supplier", label: "Supplier", icon: Truck, desc: "Provide catering, AV, decor, or photography." },
] as const;

export function RoleSelection({ onNext }: { onNext: (role: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col py-8 px-4">
      <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
        What type of partner are you?
      </h2>
      <p className="text-slate-500 mb-8">
        Select the account type that best describes your business.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const isSelected = selected === r.value;
          return (
            <label
              key={r.value}
              className={`relative flex cursor-pointer flex-col p-6 rounded-2xl border-2 transition-all ${
                isSelected
                  ? "border-[#2563EB] bg-[#EFF6FF] shadow-md shadow-[#2563EB]/10"
                  : "border-slate-200 bg-white hover:border-[#2563EB]/50 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="role_applied_for"
                value={r.value}
                checked={isSelected}
                onChange={() => setSelected(r.value)}
                className="sr-only"
              />
              <Icon className={`mb-4 h-8 w-8 ${isSelected ? "text-[#2563EB]" : "text-slate-600"}`} />
              <h3 className={`text-lg font-bold mb-1 ${isSelected ? "text-[#1D4ED8]" : "text-slate-900"}`}>
                {r.label}
              </h3>
              <p className={`text-sm ${isSelected ? "text-[#2563EB]/80" : "text-slate-500"}`}>
                {r.desc}
              </p>
            </label>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="rounded-full bg-[#111827] px-8 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
