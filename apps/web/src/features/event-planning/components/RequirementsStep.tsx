"use client";

import {
  AMENITY_REQUIREMENT_OPTIONS,
  MAX_ADDITIONAL_REQUIREMENTS_LENGTH,
} from "../domain/event-plan.constants";
import type {
  AmenityRequirement,
  EventPlanDraft,
} from "../domain/event-plan.types";
import type { EventPlanFieldErrors } from "../utils/event-plan-wizard";
import {
  CheckboxCardGroup,
  FieldError,
} from "./EventPlanningFields";

type StepProps = {
  draft: EventPlanDraft;
  errors: EventPlanFieldErrors;
  onChange: (patch: Partial<EventPlanDraft>) => void;
};

function toggleAmenity(
  values: AmenityRequirement[],
  value: AmenityRequirement,
): AmenityRequirement[] {
  if (value === "none") {
    return values.includes("none") ? [] : ["none"];
  }

  const withoutNone = values.filter((item) => item !== "none");
  return withoutNone.includes(value)
    ? withoutNone.filter((item) => item !== value)
    : [...withoutNone, value];
}

export function RequirementsStep({ draft, errors, onChange }: StepProps) {
  const requirementsLength = draft.additionalRequirements?.length ?? 0;

  return (
    <div className="space-y-8">
      <CheckboxCardGroup
        legend="Which facilities or features do you need?"
        name="requiredAmenities"
        values={draft.requiredAmenities}
        options={AMENITY_REQUIREMENT_OPTIONS}
        error={errors.requiredAmenities}
        onToggle={(value) =>
          onChange({
            requiredAmenities: toggleAmenity(draft.requiredAmenities, value),
          })
        }
      />

      <section className="space-y-3 border-t border-slate-200 pt-6">
        <div>
          <label
            htmlFor="additionalRequirements"
            className="block text-base font-bold text-slate-950"
          >
            Anything else the venue should provide?
          </label>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Optional. Keep this to practical venue requirements.
          </p>
        </div>
        <textarea
          id="additionalRequirements"
          name="additionalRequirements"
          data-field-name="additionalRequirements"
          rows={5}
          value={draft.additionalRequirements ?? ""}
          maxLength={MAX_ADDITIONAL_REQUIREMENTS_LENGTH + 20}
          aria-invalid={Boolean(errors.additionalRequirements?.length)}
          aria-describedby={
            errors.additionalRequirements?.length
              ? "additionalRequirements-error"
              : "additionalRequirements-count"
          }
          onChange={(event) =>
            onChange({ additionalRequirements: event.target.value })
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          placeholder="Example: backup indoor space, prep room access, or generator support"
        />
        <div className="flex items-center justify-between gap-3">
          <FieldError
            id="additionalRequirements-error"
            errors={errors.additionalRequirements}
          />
          <p
            id="additionalRequirements-count"
            className="ml-auto text-xs font-semibold text-slate-500"
          >
            {requirementsLength}/{MAX_ADDITIONAL_REQUIREMENTS_LENGTH}
          </p>
        </div>
      </section>
    </div>
  );
}
