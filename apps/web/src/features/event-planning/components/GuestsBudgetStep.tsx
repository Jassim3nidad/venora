"use client";

import {
  BUDGET_PREFERENCE_OPTIONS,
  GUEST_COUNT_RANGE_OPTIONS,
} from "../domain/event-plan.constants";
import type { EventPlanDraft } from "../domain/event-plan.types";
import type { EventPlanFieldErrors } from "../utils/event-plan-wizard";
import {
  RadioCardGroup,
  TextInput,
} from "./EventPlanningFields";

type StepProps = {
  draft: EventPlanDraft;
  errors: EventPlanFieldErrors;
  onChange: (patch: Partial<EventPlanDraft>) => void;
};

function parseWholeNumber(value: string) {
  if (!value.trim()) return null;
  return Number(value);
}

export function GuestsBudgetStep({ draft, errors, onChange }: StepProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-950">
            How many guests are you expecting?
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Use an exact count if you have one, or choose the closest range.
          </p>
        </div>

        <TextInput
          id="expectedGuestCount"
          label="Expected guest count"
          value={
            draft.expectedGuestCount === null
              ? ""
              : String(draft.expectedGuestCount)
          }
          inputMode="numeric"
          type="number"
          placeholder="150"
          error={errors.expectedGuestCount}
          onChange={(value) =>
            onChange({
              expectedGuestCount: parseWholeNumber(value),
              guestCountRange: null,
            })
          }
        />

        <RadioCardGroup
          legend="Or choose a guest range"
          name="guestCountRange"
          value={draft.guestCountRange}
          options={GUEST_COUNT_RANGE_OPTIONS}
          error={errors.guestCountRange}
          onChange={(guestCountRange) =>
            onChange({ guestCountRange, expectedGuestCount: null })
          }
        />
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-6">
        <div>
          <h2 className="text-base font-bold text-slate-950">
            What is your estimated total event budget?
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your budget helps Venora prioritize realistic options. You can
            change it later.
          </p>
        </div>

        <RadioCardGroup
          legend="Budget preference"
          name="budgetPreference"
          value={draft.budgetPreference}
          options={BUDGET_PREFERENCE_OPTIONS}
          error={errors.budgetPreference}
          onChange={(budgetPreference) =>
            onChange({
              budgetPreference,
              budgetMin:
                budgetPreference === "custom" ? draft.budgetMin : null,
              budgetMax:
                budgetPreference === "custom" ? draft.budgetMax : null,
            })
          }
        />

        {draft.budgetPreference === "custom" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              id="budgetMin"
              label="Minimum budget"
              type="number"
              inputMode="numeric"
              value={draft.budgetMin === null ? "" : String(draft.budgetMin)}
              placeholder="80000"
              error={errors.budgetMin}
              onChange={(value) =>
                onChange({ budgetMin: parseWholeNumber(value) })
              }
            />
            <TextInput
              id="budgetMax"
              label="Maximum budget"
              type="number"
              inputMode="numeric"
              value={draft.budgetMax === null ? "" : String(draft.budgetMax)}
              placeholder="150000"
              error={errors.budgetMax}
              onChange={(value) =>
                onChange({ budgetMax: parseWholeNumber(value) })
              }
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
