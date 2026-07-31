"use client";

import {
  ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS,
  BOOKING_URGENCY_OPTIONS,
  DECISION_MAKER_OPTIONS,
  PACKAGE_PREFERENCE_OPTIONS,
  PAYMENT_PREFERENCE_OPTIONS,
} from "../domain/event-plan.constants";
import type { EventPlanDraft } from "../domain/event-plan.types";
import type { EventPlanFieldErrors } from "../utils/event-plan-wizard";
import { RadioCardGroup } from "./EventPlanningFields";

type StepProps = {
  draft: EventPlanDraft;
  errors: EventPlanFieldErrors;
  onChange: (patch: Partial<EventPlanDraft>) => void;
};

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 text-sm font-bold text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
    >
      Skip this question
    </button>
  );
}

export function BookingPreferencesStep({
  draft,
  errors,
  onChange,
}: StepProps) {
  return (
    <div className="space-y-8">
      <section>
        <RadioCardGroup
          legend="How would you prefer to organize your event services?"
          name="packagePreference"
          value={draft.packagePreference}
          options={PACKAGE_PREFERENCE_OPTIONS}
          error={errors.packagePreference}
          onChange={(packagePreference) => onChange({ packagePreference })}
        />
        {draft.packagePreference ? (
          <ClearButton onClick={() => onChange({ packagePreference: null })} />
        ) : null}
      </section>

      <section className="border-t border-slate-200 pt-6">
        <RadioCardGroup
          legend="Are you open to suppliers recommended or accredited by the venue?"
          name="accreditedSupplierPreference"
          value={draft.accreditedSupplierPreference}
          options={ACCREDITED_SUPPLIER_PREFERENCE_OPTIONS}
          error={errors.accreditedSupplierPreference}
          onChange={(accreditedSupplierPreference) =>
            onChange({ accreditedSupplierPreference })
          }
        />
        {draft.accreditedSupplierPreference ? (
          <ClearButton
            onClick={() => onChange({ accreditedSupplierPreference: null })}
          />
        ) : null}
      </section>

      <section className="border-t border-slate-200 pt-6">
        <RadioCardGroup
          legend="What payment arrangement would you prefer?"
          name="paymentPreference"
          value={draft.paymentPreference}
          options={PAYMENT_PREFERENCE_OPTIONS}
          error={errors.paymentPreference}
          onChange={(paymentPreference) => onChange({ paymentPreference })}
        />
        {draft.paymentPreference ? (
          <ClearButton onClick={() => onChange({ paymentPreference: null })} />
        ) : null}
      </section>

      <section className="border-t border-slate-200 pt-6">
        <RadioCardGroup
          legend="How soon would you like to finalize your venue?"
          name="bookingUrgency"
          value={draft.bookingUrgency}
          options={BOOKING_URGENCY_OPTIONS}
          error={errors.bookingUrgency}
          onChange={(bookingUrgency) => onChange({ bookingUrgency })}
        />
        {draft.bookingUrgency ? (
          <ClearButton onClick={() => onChange({ bookingUrgency: null })} />
        ) : null}
      </section>

      <section className="border-t border-slate-200 pt-6">
        <RadioCardGroup
          legend="Who will help make the booking decision?"
          name="decisionMakerType"
          value={draft.decisionMakerType}
          options={DECISION_MAKER_OPTIONS}
          error={errors.decisionMakerType}
          onChange={(decisionMakerType) => onChange({ decisionMakerType })}
        />
        {draft.decisionMakerType ? (
          <ClearButton onClick={() => onChange({ decisionMakerType: null })} />
        ) : null}
      </section>
    </div>
  );
}
