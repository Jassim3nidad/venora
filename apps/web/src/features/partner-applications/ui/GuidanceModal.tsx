import { PlayCircle, MessageCircleQuestion } from "lucide-react";

export function GuidanceModal({
  onStart,
  onHelp,
}: {
  onStart: () => void;
  onHelp: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <h2 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl mb-6">
        Become a Venora Partner
      </h2>
      <p className="max-w-xl text-lg text-slate-500 mb-12">
        Join our marketplace as a Venue Owner, Event Coordinator, or Supplier.
        We require some basic business details and verification documents to
        ensure a safe and high-quality environment for our customers.
      </p>

      <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        <button
          onClick={onStart}
          className="group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200 bg-white p-8 text-center transition hover:border-[#2563EB] hover:shadow-xl hover:shadow-[#2563EB]/10"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB] transition group-hover:scale-110">
            <PlayCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Start on your own
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              I have my documents ready and want to apply right now.
            </p>
          </div>
        </button>

        <button
          onClick={onHelp}
          className="group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200 bg-white p-8 text-center transition hover:border-slate-400 hover:shadow-xl"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition group-hover:scale-110">
            <MessageCircleQuestion className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Request Admin Help
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              I need assistance with my application or have questions.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
