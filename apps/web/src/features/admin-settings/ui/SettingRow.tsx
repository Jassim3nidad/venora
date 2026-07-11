"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateSystemSettingAction } from "../application/actions";
import type { SettingDefinition, SystemSetting } from "../types/system-setting.types";

function toEditableString(value: unknown, valueType: SettingDefinition["valueType"]): string {
  if (valueType === "string[]") return Array.isArray(value) ? value.join(", ") : "";
  if (value === undefined || value === null) return "";
  return String(value);
}

export function SettingRow({ definition, setting }: { definition: SettingDefinition; setting: SystemSetting }) {
  const router = useRouter();
  const [value, setValue] = useState(() => toEditableString(setting.value, definition.valueType));
  const [checked, setChecked] = useState(() => setting.value === true);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [isPending, startTransition] = useTransition();

  function parseValue(): string | number | boolean | string[] {
    if (definition.valueType === "boolean") return checked;
    if (definition.valueType === "number") return Number(value);
    if (definition.valueType === "string[]") return value.split(",").map((v) => v.trim()).filter(Boolean);
    return value;
  }

  function save(reasonText?: string) {
    startTransition(async () => {
      const result = await updateSystemSettingAction({ key: definition.key, value: parseValue(), reason: reasonText });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${definition.label} updated`);
      setShowReason(false);
      setReason("");
      router.refresh();
    });
  }

  function handleSaveClick() {
    if (definition.isDangerous && !showReason) {
      setShowReason(true);
      return;
    }
    save(definition.isDangerous ? reason : undefined);
  }

  return (
    <div className="flex flex-col gap-2 border-b border-[#f1f5f9] py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-[45%]">
        <p className="text-sm font-bold text-[#111827]">
          {definition.label}
          {definition.isDangerous ? <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase text-red-700">Sensitive</span> : null}
        </p>
        <p className="text-xs text-[#6b7280]">{setting.description}</p>
        {setting.updatedAt ? (
          <p className="mt-1 text-[11px] text-[#9ca3af]">
            Last changed {new Date(setting.updatedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}
            {setting.updatedByName ? ` by ${setting.updatedByName}` : ""}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {definition.valueType === "boolean" ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-[#dbe3ef]"
            />
            <span className="text-sm text-[#111827]">{checked ? "Enabled" : "Disabled"}</span>
          </label>
        ) : (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
            type={definition.valueType === "number" ? "number" : "text"}
            className="w-full rounded-lg border border-[#dbe3ef] p-2 text-sm sm:w-64"
          />
        )}

        {showReason ? (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)"
            disabled={isPending}
            className="w-full rounded-lg border border-red-200 bg-red-50 p-2 text-sm sm:w-48"
          />
        ) : null}

        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isPending || (showReason && !reason.trim())}
          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1d4ed8] px-3 text-sm font-bold text-white hover:bg-[#1e40af] disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {showReason ? "Confirm" : "Save"}
        </button>
      </div>
    </div>
  );
}
