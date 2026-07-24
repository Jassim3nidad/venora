import { useState } from "react";

const CATEGORIES = {
  venue_owner: [
    "Convention Hall",
    "Garden Venue",
    "Hotel Ballroom",
    "Beachfront",
    "Restaurant",
    "Studio",
    "Other",
  ],
  event_coordinator: [
    "Venue operations support",
    "Booking coordination",
    "On-site event day staffing",
    "Multi-venue organization staff",
    "Other",
  ],
  supplier: [
    "Catering",
    "Audio/Visual",
    "Floral/Decor",
    "Photography/Videography",
    "Entertainment",
    "Rentals",
    "Other",
  ],
};

export function CategorySelection({
  role,
  onNext,
  onBack,
}: {
  role: "venue_owner" | "event_coordinator" | "supplier";
  onNext: (category: string) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const categories = CATEGORIES[role] || [];

  return (
    <div className="flex flex-col py-8 px-4">
      <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
        Which of these best describes your service?
      </h2>
      <p className="text-slate-500 mb-8">
        {role === "event_coordinator"
          ? "This helps venue organizations understand how you support their operations."
          : "This helps us categorize your profile for our customers."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 mb-10">
        {categories.map((cat) => {
          const isSelected = selected === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelected(cat)}
              className={`rounded-xl border-2 px-4 py-6 text-left font-bold transition-all ${
                isSelected
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between border-t border-slate-200 pt-6">
        <button
          onClick={onBack}
          className="rounded-full px-6 py-3 text-sm font-bold text-slate-900 underline transition hover:text-slate-600"
        >
          Back
        </button>
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
