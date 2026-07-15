import { z } from "zod";
import { SETTING_DEFINITIONS } from "../types/system-setting.types";

const SETTING_KEYS = SETTING_DEFINITIONS.map((d) => d.key) as [
  string,
  ...string[],
];

export const updateSystemSettingSchema = z.object({
  key: z.enum(SETTING_KEYS),
  // Value shape depends on the setting's valueType (string/boolean/number/
  // string[]) — validated against the specific definition in the action,
  // not here, since zod can't branch on a sibling field's runtime value
  // this cleanly for a fixed key list without a discriminated union per key.
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  reason: z.string().trim().max(500).optional(),
});

export type UpdateSystemSettingInput = z.infer<
  typeof updateSystemSettingSchema
>;
