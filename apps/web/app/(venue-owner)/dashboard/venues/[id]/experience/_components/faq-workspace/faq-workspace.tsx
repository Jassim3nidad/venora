"use client";

import { type FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { Panel } from "@/components/dashboard/enterprise";
import { SectionTitle } from "../section-title";
import { SubmitButton } from "../submit-button";
import {
  VENUE_FAQ_CATEGORIES,
  getVenueFaqCategoryLabel,
  type DraftStructuredVenueProfile,
  type VenueFaq,
  type VenueFaqCategory
} from "@/src/features/venues/domain/structured-venue.types";

const inputClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";
const textareaClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";
const editorCardClass = "rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm";

const SUGGESTED_FAQS: { category: string, question: string }[] = [
  { category: "logistics", question: "Do you have on-site parking?" },
  { category: "vendors", question: "Can we bring our own caterer or alcohol?" },
  { category: "restrictions", question: "Are real candles or sparklers allowed?" },
  { category: "timing", question: "What time do we need to end the music?" },
];

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-bold text-[#334155]">{label}</p>
      {children}
    </div>
  );
}

export function FaqWorkspace({
  profile,
  onCreate,
  onArchive,
  onReorder,
}: {
  profile: DraftStructuredVenueProfile;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onArchive: (faq: VenueFaq) => void;
  onReorder: (faqId: string, direction: "up" | "down") => void;
}) {
  const activeFaqs = profile.faqs.filter((faq) => faq.status !== "archived");
  
  const [isAdding, setIsAdding] = useState(false);
  const [prefilledQuestion, setPrefilledQuestion] = useState("");
  const [prefilledCategory, setPrefilledCategory] = useState("");

  const handleSuggest = (category: string, question: string) => {
    setPrefilledCategory(category);
    setPrefilledQuestion(question);
    setIsAdding(true);
  };

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    onCreate(e);
    setIsAdding(false);
    setPrefilledQuestion("");
    setPrefilledCategory("");
  };

  return (
    <Panel>
      <SectionTitle
        title="FAQs"
        description="Provide quick answers to the most common questions customers ask before booking."
      />
      
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main List Area */}
        <div className="space-y-5">
          {activeFaqs.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center">
              <h4 className="text-base font-bold text-[#0f172a]">No FAQs yet</h4>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#64748b]">
                Anticipating your customers' questions reduces back-and-forth communication.
              </p>
              {!isAdding && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1e40af]"
                >
                  <Plus className="h-4 w-4" />
                  Add your first FAQ
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#334155]">{activeFaqs.length} Active FAQs</p>
                {!isAdding && (
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#1d4ed8] hover:text-[#1e40af]"
                  >
                    <Plus className="h-4 w-4" />
                    Add FAQ
                  </button>
                )}
              </div>
              {activeFaqs.map((faq) => (
                <div key={faq.id} className="rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-sm transition-all hover:border-[#93c5fd]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-[#0f172a]">{faq.question}</h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475569]">{faq.answer}</p>
                      <p className="mt-3 inline-block rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-bold text-[#64748b]">
                        {faq.category ? getVenueFaqCategoryLabel(faq.category as VenueFaqCategory) : "General"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-[#f1f5f9]">
                    <button
                      type="button"
                      onClick={() => onReorder(faq.id, "up")}
                      className="rounded-lg border border-[#dbe3ef] px-2.5 py-1 text-xs font-bold text-[#475569] transition hover:border-[#93c5fd] hover:bg-[#f8fbff] hover:text-[#1d4ed8]"
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorder(faq.id, "down")}
                      className="rounded-lg border border-[#dbe3ef] px-2.5 py-1 text-xs font-bold text-[#475569] transition hover:border-[#93c5fd] hover:bg-[#f8fbff] hover:text-[#1d4ed8]"
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      onClick={() => onArchive(faq)}
                      className="ml-auto rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Area */}
        <div className="space-y-6">
          {isAdding && (
            <form onSubmit={handleCreate} className={editorCardClass}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-[#0f172a]">Add FAQ</h3>
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="rounded-full p-1 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4">
                <Field label="Category">
                  <select name="category" className={inputClass} defaultValue={prefilledCategory}>
                    <option value="">General</option>
                    {VENUE_FAQ_CATEGORIES.map((value) => (
                      <option key={value} value={value}>{getVenueFaqCategoryLabel(value)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Question">
                  <input name="question" required maxLength={200} className={inputClass} defaultValue={prefilledQuestion} placeholder="e.g. Do you allow outside catering?" />
                </Field>
                <Field label="Answer">
                  <textarea name="answer" required maxLength={2000} rows={5} className={textareaClass} placeholder="Provide a clear, helpful answer..." />
                </Field>
              </div>
              <SubmitButton label="Save FAQ" />
            </form>
          )}

          {!isAdding && (
            <div className="rounded-xl border border-[#dbe3ef] bg-[#f8fbff] p-5">
              <h3 className="text-sm font-bold text-[#0f172a]">Suggested Questions</h3>
              <p className="mt-1 text-xs text-[#64748b]">Click to add a standard question to your profile.</p>
              <div className="mt-4 flex flex-col gap-2">
                {SUGGESTED_FAQS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggest(suggestion.category, suggestion.question)}
                    className="flex items-start gap-3 rounded-lg border border-[#cbd5e1] bg-white p-3 text-left transition hover:border-[#93c5fd] hover:shadow-sm"
                  >
                    <Plus className="mt-0.5 h-4 w-4 shrink-0 text-[#1d4ed8]" />
                    <span className="text-sm font-medium text-[#334155]">{suggestion.question}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
