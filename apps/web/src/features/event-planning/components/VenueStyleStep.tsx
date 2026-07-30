"use client";

import {
  PRIORITY_FACTOR_OPTIONS,
  VENUE_SETTING_OPTIONS,
  VENUE_STYLE_OPTIONS,
} from "../domain/event-plan.constants";
import type {
  EventPlanDraft,
  PriorityFactor,
  VenueStyle,
} from "../domain/event-plan.types";
import type { EventPlanFieldErrors } from "../utils/event-plan-wizard";
import {
  CheckboxCardGroup,
  FieldError,
  RadioCardGroup,
  SelectInput,
} from "./EventPlanningFields";

type StepProps = {
  draft: EventPlanDraft;
  errors: EventPlanFieldErrors;
  onChange: (patch: Partial<EventPlanDraft>) => void;
};

function toggleStyle(values: VenueStyle[], value: VenueStyle): VenueStyle[] {
  if (value === "no-preference") {
    return values.includes("no-preference") ? [] : ["no-preference"];
  }

  const withoutNoPreference = values.filter((item) => item !== "no-preference");
  return withoutNoPreference.includes(value)
    ? withoutNoPreference.filter((item) => item !== value)
    : [...withoutNoPreference, value];
}

function updatePriority(
  values: PriorityFactor[],
  index: number,
  value: string,
) {
  const next = [...values];
  const priority = value as PriorityFactor;

  if (!value) {
    next.splice(index, 1);
    return next;
  }

  if (values.includes(priority) && values[index] !== priority) {
    return values;
  }

  next[index] = priority;
  return next.filter(Boolean);
}

export function VenueStyleStep({ draft, errors, onChange }: StepProps) {
  return (
    <div className="space-y-8">
      <CheckboxCardGroup
        legend="What kind of atmosphere are you looking for?"
        name="venueStyles"
        values={draft.venueStyles}
        options={VENUE_STYLE_OPTIONS}
        error={errors.venueStyles}
        onToggle={(value) =>
          onChange({ venueStyles: toggleStyle(draft.venueStyles, value) })
        }
      />

      <RadioCardGroup
        legend="What setting do you prefer?"
        name="settingPreference"
        value={draft.settingPreference}
        options={VENUE_SETTING_OPTIONS}
        error={errors.settingPreference}
        onChange={(settingPreference) => onChange({ settingPreference })}
      />

      <section className="space-y-4 border-t border-slate-200 pt-6">
        <div>
          <h2 className="text-base font-bold text-slate-950">
            Which factors matter most?
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Choose up to three priorities. Your priorities will later help
            Venora order suitable venue options.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {["Most important", "Second most important", "Third most important"].map(
            (label, index) => (
              <SelectInput
                key={label}
                id={`rankedPriorities-${index}`}
                label={label}
                value={draft.rankedPriorities[index] ?? ""}
                options={PRIORITY_FACTOR_OPTIONS.map((option) => ({
                  ...option,
                  label:
                    draft.rankedPriorities.includes(option.value) &&
                    draft.rankedPriorities[index] !== option.value
                      ? `${option.label} (already selected)`
                      : option.label,
                }))}
                placeholder="No priority"
                onChange={(value) =>
                  onChange({
                    rankedPriorities: updatePriority(
                      draft.rankedPriorities,
                      index,
                      value,
                    ),
                  })
                }
              />
            ),
          )}
        </div>
        <FieldError id="rankedPriorities-error" errors={errors.rankedPriorities} />
      </section>
    </div>
  );
}
