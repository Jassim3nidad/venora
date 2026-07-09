"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AvatarUpload } from "@/features/auth/ui/AvatarUpload";
import {
  completeProfileSetupAction,
  skipProfileSetupAction,
} from "@/features/auth/actions/profile-setup.actions";
import {
  PROFILE_EVENT_TYPE_OPTIONS,
  profileSetupSchema,
  type ProfilePreferencesInput,
} from "@/features/auth/schemas/profile-setup.schema";

type SetupStep = "photo" | "details" | "preferences";

const STEPS: { id: SetupStep; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "details", label: "Details" },
  { id: "preferences", label: "Preferences" },
];

type ProfileSetupWizardProps = {
  userId: string;
  email: string;
  initialFullName: string;
  initialPhone: string;
  initialAvatarUrl: string | null;
};

function StepIndicator({
  currentStep,
}: {
  currentStep: SetupStep;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = index < currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold transition",
                isActive
                  ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25"
                  : isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400",
              ].join(" ")}
            >
              {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={[
                "hidden text-xs font-bold sm:inline",
                isActive ? "text-[#2563EB]" : "text-slate-400",
              ].join(" ")}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <div
                className={[
                  "hidden h-px w-8 sm:block",
                  index < currentIndex ? "bg-emerald-300" : "bg-slate-200",
                ].join(" ")}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PreferenceToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-[#F9FAFB] p-4 transition hover:border-[#DBEAFE] hover:bg-[#EFF6FF]/40"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30"
      />
      <span>
        <span className="block text-sm font-extrabold text-slate-800">{label}</span>
        <span className="mt-1 block text-sm font-medium leading-6 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function WizardContent({
  userId,
  email,
  initialFullName,
  initialPhone,
  initialAvatarUrl,
  onSkip,
  isSkipping,
}: ProfileSetupWizardProps & {
  onSkip: () => void;
  isSkipping: boolean;
}) {
  const [step, setStep] = useState<SetupStep>("photo");
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [preferences, setPreferences] = useState<ProfilePreferencesInput>({
    emailNotifications: true,
    bookingReminders: true,
    marketingEmails: false,
    preferredEventTypes: [],
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isBusy = isPending || isSkipping;
  const currentStepIndex = STEPS.findIndex((item) => item.id === step);

  const goBack = () => {
    if (step === "details") setStep("photo");
    if (step === "preferences") setStep("details");
  };

  const goNext = () => {
    setGeneralError(null);
    setFieldErrors({});

    if (step === "photo") {
      setStep("details");
      return;
    }

    if (step === "details") {
      const result = profileSetupSchema
        .pick({ fullName: true, phone: true })
        .safeParse({ fullName, phone });

      if (!result.success) {
        setFieldErrors(result.error.flatten().fieldErrors);
        return;
      }

      setStep("preferences");
    }
  };

  const handleComplete = () => {
    setGeneralError(null);
    setFieldErrors({});

    const result = profileSetupSchema.safeParse({
      fullName,
      phone,
      preferences,
    });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await completeProfileSetupAction(result.data);

      if (response && !response.success) {
        setGeneralError(response.error);
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
      }
    });
  };

  const toggleEventType = (eventType: string) => {
    setPreferences((current) => {
      const selected = current.preferredEventTypes ?? [];
      const exists = selected.includes(eventType);

      return {
        ...current,
        preferredEventTypes: exists
          ? selected.filter((item) => item !== eventType)
          : [...selected, eventType],
      };
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#E5E7EB]/80 px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
              Welcome to Venora
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
              Set up your profile
            </h1>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
              Add a few details so we can personalize venue recommendations and
              keep your bookings organized.
            </p>
          </div>

          <button
            type="button"
            onClick={onSkip}
            disabled={isBusy}
            className="shrink-0 text-sm font-bold text-slate-500 transition hover:text-slate-800 disabled:opacity-60"
          >
            Skip for now
          </button>
        </div>

        <div className="mt-5">
          <StepIndicator currentStep={step} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
        {generalError ? (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {generalError}
          </div>
        ) : null}

        {step === "photo" ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Profile picture</h2>
                <p className="text-sm font-medium text-slate-500">
                  Help hosts recognize you. You can change this anytime in Account.
                </p>
              </div>
            </div>

            <AvatarUpload
              userId={userId}
              initialAvatarUrl={initialAvatarUrl}
              displayName={fullName || initialFullName || "Venora User"}
            />
          </div>
        ) : null}

        {step === "details" ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Personal details</h2>
                <p className="text-sm font-medium text-slate-500">
                  Confirm how we should address you and how to reach you about bookings.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="setup-full-name"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Display name
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="setup-full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={isBusy}
                  autoComplete="name"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </div>
              {fieldErrors.fullName?.[0] ? (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  {fieldErrors.fullName[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="setup-phone"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Phone number <span className="font-medium text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="setup-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="09171234567"
                  disabled={isBusy}
                  autoComplete="tel"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </div>
              {fieldErrors.phone?.[0] ? (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  {fieldErrors.phone[0]}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#E5E7EB]/80 bg-[#F9FAFB] p-4">
              <div className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                <div>
                  <p className="text-sm font-extrabold text-slate-800">Account email</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{email}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === "preferences" ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Your preferences</h2>
                <p className="text-sm font-medium text-slate-500">
                  Choose what updates you want and the kinds of events you are planning.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <PreferenceToggle
                id="pref-email-notifications"
                label="Booking updates by email"
                description="Get notified when venues respond to your requests."
                checked={preferences.emailNotifications}
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    emailNotifications: checked,
                  }))
                }
                disabled={isBusy}
              />
              <PreferenceToggle
                id="pref-booking-reminders"
                label="Event reminders"
                description="Receive reminders before your confirmed event dates."
                checked={preferences.bookingReminders}
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    bookingReminders: checked,
                  }))
                }
                disabled={isBusy}
              />
              <PreferenceToggle
                id="pref-marketing-emails"
                label="Venue inspiration and offers"
                description="Occasional curated venue picks and seasonal promotions."
                checked={preferences.marketingEmails}
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    marketingEmails: checked,
                  }))
                }
                disabled={isBusy}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-bold text-slate-700">
                What are you planning? <span className="font-medium text-slate-400">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {PROFILE_EVENT_TYPE_OPTIONS.map((eventType) => {
                  const selected = preferences.preferredEventTypes?.includes(eventType);

                  return (
                    <button
                      key={eventType}
                      type="button"
                      disabled={isBusy}
                      onClick={() => toggleEventType(eventType)}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-bold transition",
                        selected
                          ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#DBEAFE] hover:text-[#2563EB]",
                      ].join(" ")}
                    >
                      {eventType}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#E5E7EB]/80 bg-[#F9FAFB] px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={isBusy || currentStepIndex === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step === "preferences" ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isBusy}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Save and continue
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={isBusy}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfileSetupWizard(props: ProfileSetupWizardProps) {
  const [isSkipping, startSkipTransition] = useTransition();

  const handleSkip = () => {
    startSkipTransition(async () => {
      await skipProfileSetupAction();
    });
  };

  return (
    <>
      {/* Mobile: bottom-sheet style modal flow */}
      <div className="lg:hidden">
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]" />
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-[#E5E7EB]/80 bg-white shadow-2xl shadow-slate-900/20">
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
          </div>
          <WizardContent {...props} onSkip={handleSkip} isSkipping={isSkipping} />
        </div>
      </div>

      {/* Desktop: full-page guided setup */}
      <div className="hidden min-h-screen items-center justify-center bg-[#F9FAFB] px-6 py-10 lg:flex">
        <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
          <WizardContent {...props} onSkip={handleSkip} isSkipping={isSkipping} />
        </div>
      </div>
    </>
  );
}
