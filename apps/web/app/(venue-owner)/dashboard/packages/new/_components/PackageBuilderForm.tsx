"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Users,
  CircleDollarSign,
  CalendarRange,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ArrowLeft,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import {
  createVenuePackage,
  updateVenuePackage,
} from "@/src/features/venues/application/package-actions";
import type { EligibleSupplier } from "@/src/features/venues/application/package-queries";
import { EligibleSuppliersPanel } from "./EligibleSuppliersPanel";

type Venue = {
  id: string;
  name: string;
  province: string;
  capacity_max: number;
};
type EventType = { id: string; name: string };
type Amenity = { id: string; name: string };

export type PackageInitialData = {
  id: string;
  venueId: string;
  name: string;
  description: string;
  eventTypeId: string;
  minGuests: number | "";
  maxGuests: number | "";
  price: number | "";
  priceUnit: string;
  depositPercentage: number | "";
  depositFlatAmount: number | "";
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  amenityIds: string[];
  venueRules: string;
  inclusions: string[];
  suppliers: SelectedSupplier[];
};

type Props = {
  venues: Venue[];
  eventTypes: EventType[];
  amenities: Amenity[];
  eligibleSuppliersByVenue: Record<string, EligibleSupplier[]>;
  initialData?: PackageInitialData;
};

type SelectedSupplier = {
  supplierId: string;
  agreementId: string;
  includedPrice: number;
};

const STEPS = [
  { id: "details", label: "Package Details", icon: Package },
  { id: "capacity", label: "Capacity & Pricing", icon: Users },
  { id: "availability", label: "Availability", icon: CalendarRange },
  { id: "amenities", label: "Amenities & Rules", icon: ClipboardList },
  { id: "suppliers", label: "Add Suppliers", icon: Sparkles },
  { id: "review", label: "Review & Publish", icon: ShieldCheck },
];

export function PackageBuilderForm({
  venues,
  eventTypes,
  amenities,
  eligibleSuppliersByVenue,
  initialData,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [venueId, setVenueId] = useState(
    initialData?.venueId ?? venues[0]?.id ?? "",
  );
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [eventTypeId, setEventTypeId] = useState(
    initialData?.eventTypeId ?? "",
  );
  const [minGuests, setMinGuests] = useState<number | "">(
    initialData?.minGuests ?? "",
  );
  const [maxGuests, setMaxGuests] = useState<number | "">(
    initialData?.maxGuests ?? "",
  );
  const [price, setPrice] = useState<number | "">(initialData?.price ?? "");
  const [priceUnit, setPriceUnit] = useState(
    initialData?.priceUnit ?? "per_event",
  );
  const [depositType, setDepositType] = useState<
    "percentage" | "flat" | "none"
  >(
    initialData?.depositPercentage
      ? "percentage"
      : initialData?.depositFlatAmount
        ? "flat"
        : "percentage",
  );
  const [depositPercentage, setDepositPercentage] = useState<number | "">(
    initialData?.depositPercentage ?? 30,
  );
  const [depositFlat, setDepositFlat] = useState<number | "">(
    initialData?.depositFlatAmount ?? "",
  );
  const [validFrom, setValidFrom] = useState(initialData?.validFrom ?? "");
  const [validUntil, setValidUntil] = useState(initialData?.validUntil ?? "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(
    new Set(initialData?.amenityIds ?? []),
  );
  const [venueRules, setVenueRules] = useState(initialData?.venueRules ?? "");
  const [inclusions, setInclusions] = useState(
    initialData?.inclusions?.join("\n") ?? "",
  );
  const [selectedSuppliers, setSelectedSuppliers] = useState<
    SelectedSupplier[]
  >(initialData?.suppliers ?? []);

  const eligibleSuppliers = venueId
    ? (eligibleSuppliersByVenue[venueId] ?? [])
    : [];
  const selectedVenue = venues.find((v) => v.id === venueId);
  const totalSupplierCost = selectedSuppliers.reduce(
    (sum, s) => sum + s.includedPrice,
    0,
  );
  const totalPackagePrice = (Number(price) || 0) + totalSupplierCost;

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!venueId || !name || !price) {
      setError("Please fill in all required fields.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const payload = {
        venueId,
        name,
        description,
        eventTypeId: eventTypeId || null,
        minGuests: Number(minGuests) || null,
        maxGuests: Number(maxGuests) || null,
        price: Number(price),
        priceUnit,
        depositPercentage:
          depositType === "percentage"
            ? Number(depositPercentage) || null
            : null,
        depositFlatAmount:
          depositType === "flat" ? Number(depositFlat) || null : null,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        amenityIds: Array.from(selectedAmenities),
        venueRules,
        inclusions: inclusions
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        isActive,
        suppliers: selectedSuppliers,
      };

      const result = initialData
        ? await updateVenuePackage(initialData.id, payload)
        : await createVenuePackage(payload);

      if (result.success) {
        router.push("/dashboard/packages");
      } else {
        setError(result.error);
      }
    });
  };

  const canNextStep = () => {
    if (step === 0) return !!(venueId && name);
    if (step === 1) return !!(price && Number(price) > 0);
    return true;
  };

  const stepClass = (i: number) =>
    i === step
      ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
      : i < step
        ? "bg-emerald-500 text-white"
        : "bg-slate-100 text-slate-400";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicators */}
      <div className="mb-10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1 min-w-max mx-auto justify-center">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${stepClass(i)} ${i !== step ? "cursor-pointer hover:opacity-80" : ""}`}
                >
                  {i < step ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden">
        {/* Step content */}
        <div className="p-6 sm:p-8">
          {/* ── STEP 0: Package Details ── */}
          {step === 0 && (
            <StepSection title="Package Details" icon={Package} color="blue">
              <div className="space-y-5">
                <Field label="Venue *">
                  <select
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.province}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Package Name *">
                  <input
                    type="text"
                    placeholder="e.g. Premium Wedding Package"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    placeholder="Describe what's included and what makes this package special..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={textareaClass}
                  />
                </Field>

                <Field label="Event Type">
                  <select
                    value={eventTypeId}
                    onChange={(e) => setEventTypeId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">— Any event type —</option>
                    {eventTypes.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </StepSection>
          )}

          {/* ── STEP 1: Capacity & Pricing ── */}
          {step === 1 && (
            <StepSection
              title="Capacity & Pricing"
              icon={CircleDollarSign}
              color="emerald"
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Minimum Guests">
                    <input
                      type="number"
                      min="1"
                      placeholder={`1`}
                      value={minGuests}
                      onChange={(e) =>
                        setMinGuests(Number(e.target.value) || "")
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Maximum Guests">
                    <input
                      type="number"
                      min="1"
                      placeholder={
                        selectedVenue
                          ? String(selectedVenue.capacity_max)
                          : "e.g. 300"
                      }
                      value={maxGuests}
                      onChange={(e) =>
                        setMaxGuests(Number(e.target.value) || "")
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Venue Rental Price * (₱)">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        ₱
                      </span>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 150000"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value) || "")}
                        className={`${inputClass} pl-9`}
                        required
                      />
                    </div>
                  </Field>

                  <Field label="Price Unit">
                    <select
                      value={priceUnit}
                      onChange={(e) => setPriceUnit(e.target.value)}
                      className={selectClass}
                    >
                      <option value="per_event">Per Event</option>
                      <option value="per_hour">Per Hour</option>
                      <option value="per_day">Per Day</option>
                      <option value="per_person">Per Person</option>
                    </select>
                  </Field>
                </div>

                {/* Deposit */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <Field label="Deposit Requirement">
                    <div className="flex gap-3 flex-wrap">
                      {(["percentage", "flat", "none"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setDepositType(t)}
                          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                            depositType === t
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {t === "percentage"
                            ? "% of Total"
                            : t === "flat"
                              ? "Flat Amount"
                              : "No Deposit"}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {depositType === "percentage" && (
                    <Field label="Deposit Percentage">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={depositPercentage}
                          onChange={(e) =>
                            setDepositPercentage(Number(e.target.value) || "")
                          }
                          className={`${inputClass} pr-9`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          %
                        </span>
                      </div>
                      {price && depositPercentage && (
                        <p className="text-xs text-slate-500 mt-1.5 font-medium">
                          = ₱
                          {(
                            ((Number(price) || 0) *
                              (Number(depositPercentage) || 0)) /
                            100
                          ).toLocaleString()}{" "}
                          deposit
                        </p>
                      )}
                    </Field>
                  )}

                  {depositType === "flat" && (
                    <Field label="Flat Deposit Amount (₱)">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 50000"
                          value={depositFlat}
                          onChange={(e) =>
                            setDepositFlat(Number(e.target.value) || "")
                          }
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </Field>
                  )}
                </div>

                {/* Inclusions */}
                <Field
                  label="Package Inclusions"
                  hint="One item per line. These appear as bullet points on the package page."
                >
                  <textarea
                    placeholder={
                      "Use of venue for 10 hours\n50 round tables with linens\nCatering kitchen access"
                    }
                    value={inclusions}
                    onChange={(e) => setInclusions(e.target.value)}
                    rows={5}
                    className={textareaClass}
                  />
                </Field>
              </div>
            </StepSection>
          )}

          {/* ── STEP 2: Availability ── */}
          {step === 2 && (
            <StepSection
              title="Availability"
              icon={CalendarRange}
              color="violet"
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    label="Valid From"
                    hint="Earliest booking date for this package"
                  >
                    <input
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Valid Until"
                    hint="Latest booking date for this package"
                  >
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      min={validFrom}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      Publish immediately
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      When active, this package is visible to customers on the
                      venue page.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </StepSection>
          )}

          {/* ── STEP 3: Amenities & Rules ── */}
          {step === 3 && (
            <StepSection
              title="Amenities & Rules"
              icon={ClipboardList}
              color="amber"
            >
              <div className="space-y-6">
                <Field
                  label="Included Amenities"
                  hint="Select the amenities included in this package"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {amenities.map((a) => {
                      const checked = selectedAmenities.has(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleAmenity(a.id)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                            checked
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {checked && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                  {selectedAmenities.size > 0 && (
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                      {selectedAmenities.size} amenit
                      {selectedAmenities.size !== 1 ? "ies" : "y"} selected
                    </p>
                  )}
                </Field>

                <Field
                  label="Venue Rules"
                  hint="Rules specific to this package. Shown to customers before booking."
                >
                  <textarea
                    placeholder="e.g. No outside caterers allowed. Confetti prohibited. Sound system must be off by 10pm."
                    value={venueRules}
                    onChange={(e) => setVenueRules(e.target.value)}
                    rows={4}
                    className={textareaClass}
                  />
                </Field>
              </div>
            </StepSection>
          )}

          {/* ── STEP 4: Add Suppliers ── */}
          {step === 4 && (
            <StepSection
              title="Add Accredited Suppliers"
              icon={Sparkles}
              color="indigo"
            >
              <p className="text-sm text-slate-500 font-medium mb-5 leading-relaxed">
                Only suppliers with an{" "}
                <strong className="text-slate-700">active partnership</strong>{" "}
                and an{" "}
                <strong className="text-slate-700">
                  active commercial agreement
                </strong>{" "}
                with{" "}
                <strong className="text-slate-700">
                  {selectedVenue?.name}
                </strong>{" "}
                are shown below. Selecting a supplier adds their service
                component to the package at the agreed price.
              </p>
              <EligibleSuppliersPanel
                suppliers={eligibleSuppliers}
                initialSelected={selectedSuppliers}
                onChange={setSelectedSuppliers}
              />
            </StepSection>
          )}

          {/* ── STEP 5: Review & Publish ── */}
          {step === 5 && (
            <StepSection
              title="Review & Publish"
              icon={ShieldCheck}
              color="emerald"
            >
              <div className="space-y-6">
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <SummaryRow label="Venue" value={selectedVenue?.name ?? "—"} />
                <SummaryRow label="Package Name" value={name || "—"} />
                <SummaryRow
                  label="Event Type"
                  value={
                    eventTypes.find((e) => e.id === eventTypeId)?.name ?? "Any"
                  }
                />
                <SummaryRow
                  label="Capacity"
                  value={
                    minGuests || maxGuests
                      ? `${minGuests || 1} – ${maxGuests || "∞"} guests`
                      : "Any size"
                  }
                />

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900">
                      Pricing Breakdown
                    </h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="flex justify-between px-5 py-3 text-sm">
                      <span className="text-slate-600 font-medium">
                        Venue Rental
                      </span>
                      <span className="font-bold text-slate-900">
                        ₱{(Number(price) || 0).toLocaleString()} /{" "}
                        {priceUnit.replace("_", " ")}
                      </span>
                    </div>
                    {selectedSuppliers.map((s) => {
                      const sup = eligibleSuppliers.find(
                        (e) => e.supplier_id === s.supplierId,
                      );
                      return (
                        <div
                          key={s.supplierId}
                          className="flex justify-between px-5 py-3 text-sm"
                        >
                          <span className="text-slate-600 font-medium">
                            {sup?.business_name ?? "Supplier"}
                          </span>
                          <span className="font-bold text-slate-700">
                            ₱{s.includedPrice.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between px-5 py-4 bg-slate-50">
                      <span className="font-bold text-slate-900">
                        Package Total
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        ₱{totalPackagePrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {depositType !== "none" && (
                  <SummaryRow
                    label="Deposit"
                    value={
                      depositType === "percentage"
                        ? `${depositPercentage}% = ₱${(
                            (totalPackagePrice *
                              (Number(depositPercentage) || 0)) /
                            100
                          ).toLocaleString()}`
                        : `₱${(Number(depositFlat) || 0).toLocaleString()}`
                    }
                  />
                )}

                {(validFrom || validUntil) && (
                  <SummaryRow
                    label="Available Dates"
                    value={`${validFrom || "Any"} → ${validUntil || "Any"}`}
                  />
                )}

                <SummaryRow
                  label="Status"
                  value={isActive ? "Published immediately" : "Saved as draft"}
                />

                {selectedSuppliers.length > 0 && (
                  <SummaryRow
                    label="Included Suppliers"
                    value={`${selectedSuppliers.length} supplier${selectedSuppliers.length !== 1 ? "s" : ""}`}
                  />
                )}
              </div>
            </StepSection>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-5 border-t border-slate-100 bg-white flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.08)]">
          <button
            type="button"
            onClick={() =>
              step === 0
                ? router.push("/dashboard/packages")
                : setStep((s) => s - 1)
            }
            className="flex items-center gap-2 rounded-xl h-11 px-5 border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (!canNextStep()) {
                  setError(
                    "Please fill in all required fields before continuing.",
                  );
                  return;
                }
                setError(null);
                setStep((s) => s + 1);
              }}
              className="flex items-center gap-2 rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 shadow-md shadow-blue-500/20 transition-colors text-sm"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 shadow-md shadow-emerald-500/20 transition-colors text-sm disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isActive ? "Publish Package" : "Save as Draft"}
            </button>
          )}
        </div>
      </div>

      {error && step !== 5 && (
        <p className="text-center text-sm text-red-600 font-medium mt-4">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
const selectClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer";
const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none";

const sectionColors = {
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  violet: "bg-violet-100 text-violet-600",
  amber: "bg-amber-100 text-amber-600",
  indigo: "bg-indigo-100 text-indigo-600",
} as const;

function StepSection({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: React.FC<{ className?: string }>;
  color: keyof typeof sectionColors;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${sectionColors[color]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-500 font-medium">{hint}</p>}
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 font-medium shrink-0">
        {label}
      </span>
      <span className="text-sm font-bold text-slate-900 text-right">
        {value}
      </span>
    </div>
  );
}
