import { createClient } from "@/lib/supabase/server";
import { SETTING_DEFINITIONS } from "../types/system-setting.types";
import type { SettingHistoryEntry, SystemSetting } from "../types/system-setting.types";

export async function getSystemSettings(): Promise<{
  settings: SystemSetting[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("system_settings")
    .select("key, category, value, description, is_dangerous, updated_at, profiles:updated_by (full_name)");

  if (error) return { settings: null, error: error.message };

  const byKey = new Map((data ?? []).map((row: any) => [row.key, row]));

  // Iterate SETTING_DEFINITIONS (not the raw rows) so the page always shows
  // every known setting in a stable order, even if a row is somehow missing.
  const settings: SystemSetting[] = SETTING_DEFINITIONS.map((def) => {
    const row = byKey.get(def.key) as any;
    return {
      key: def.key,
      category: def.category,
      value: row?.value,
      description: row?.description ?? def.label,
      isDangerous: def.isDangerous,
      updatedByName: row?.profiles?.full_name ?? null,
      updatedAt: row?.updated_at ?? "",
    };
  });

  return { settings, error: null };
}

export async function getSettingHistory(key: string): Promise<{
  history: SettingHistoryEntry[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("system_setting_history")
    .select("id, setting_key, previous_value, new_value, reason, created_at, profiles:actor_id (full_name)")
    .eq("setting_key", key)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { history: null, error: error.message };

  const history: SettingHistoryEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    settingKey: row.setting_key,
    previousValue: row.previous_value,
    newValue: row.new_value,
    reason: row.reason,
    actorName: row.profiles?.full_name ?? null,
    createdAt: row.created_at,
  }));

  return { history, error: null };
}
