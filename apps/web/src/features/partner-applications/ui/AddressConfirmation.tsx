import { useState } from "react";
import type { PartnerApplicationInput } from "../schemas/partner.schema";

export function AddressConfirmation({
  onNext,
  onBack,
}: {
  onNext: (address: PartnerApplicationInput["address"]) => void;
  onBack: () => void;
}) {
  const [address, setAddress] = useState<PartnerApplicationInput["address"]>({
    country: "Philippines",
    unit: "",
    building: "",
    street: "",
    district: "",
    city: "",
    zip: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof PartnerApplicationInput["address"], string>>
  >({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!address.country.trim()) newErrors.country = "Required";
    if (!address.street.trim()) newErrors.street = "Required";
    if (!address.district.trim()) newErrors.district = "Required";
    if (!address.city.trim()) newErrors.city = "Required";
    if (!address.zip.trim()) newErrors.zip = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext(address);
    }
  };

  return (
    <div className="flex flex-col py-8 px-4">
      <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
        Confirm your business address
      </h2>
      <p className="text-slate-500 mb-8">
        Your address is only shared with guests after they've made a
        reservation.
      </p>

      <div className="space-y-4 mb-10">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Country / Region
          </label>
          <input
            type="text"
            value={address.country}
            onChange={(e) =>
              setAddress({ ...address, country: e.target.value })
            }
            className={`h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition ${
              errors.country
                ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                : "border-slate-200 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            }`}
          />
          {errors.country && (
            <p className="mt-1 text-xs text-red-500">{errors.country}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Unit / Level (Optional)
            </label>
            <input
              type="text"
              value={address.unit}
              onChange={(e) => setAddress({ ...address, unit: e.target.value })}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Building name (Optional)
            </label>
            <input
              type="text"
              value={address.building}
              onChange={(e) =>
                setAddress({ ...address, building: e.target.value })
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Street address
          </label>
          <input
            type="text"
            value={address.street}
            onChange={(e) => setAddress({ ...address, street: e.target.value })}
            className={`h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition ${
              errors.street
                ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                : "border-slate-200 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            }`}
          />
          {errors.street && (
            <p className="mt-1 text-xs text-red-500">{errors.street}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Barangay / District
          </label>
          <input
            type="text"
            value={address.district}
            onChange={(e) =>
              setAddress({ ...address, district: e.target.value })
            }
            className={`h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition ${
              errors.district
                ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                : "border-slate-200 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            }`}
          />
          {errors.district && (
            <p className="mt-1 text-xs text-red-500">{errors.district}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              City / Municipality
            </label>
            <input
              type="text"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              className={`h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition ${
                errors.city
                  ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              }`}
            />
            {errors.city && (
              <p className="mt-1 text-xs text-red-500">{errors.city}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              ZIP code
            </label>
            <input
              type="text"
              value={address.zip}
              onChange={(e) => setAddress({ ...address, zip: e.target.value })}
              className={`h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition ${
                errors.zip
                  ? "border-red-500 focus:ring-4 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              }`}
            />
            {errors.zip && (
              <p className="mt-1 text-xs text-red-500">{errors.zip}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between border-t border-slate-200 pt-6">
        <button
          onClick={onBack}
          className="rounded-full px-6 py-3 text-sm font-bold text-slate-900 underline transition hover:text-slate-600"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="rounded-full bg-[#111827] px-8 py-3 text-sm font-bold text-white transition hover:bg-black"
        >
          Next
        </button>
      </div>
    </div>
  );
}
