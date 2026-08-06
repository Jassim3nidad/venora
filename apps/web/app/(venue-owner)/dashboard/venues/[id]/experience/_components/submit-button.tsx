"use client";

import { Save } from "lucide-react";

export function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200/70 transition hover:bg-[#1e40af]"
    >
      <Save className="h-4 w-4" />
      {label}
    </button>
  );
}
