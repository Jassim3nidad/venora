export type SettingCategory = "general" | "marketplace" | "security" | "maintenance";
export type SettingValueType = "string" | "boolean" | "number" | "string[]";

export type SettingDefinition = {
  key: string;
  category: SettingCategory;
  label: string;
  valueType: SettingValueType;
  isDangerous: boolean;
};

/**
 * The fixed, typed set of editable settings — NOT a free-form key/value
 * interface. Every key here must exist as a seeded row in system_settings
 * (migration 058); admin_update_system_setting() only accepts keys that
 * already exist, so this list and the DB seed must stay in sync.
 */
export const SETTING_DEFINITIONS: SettingDefinition[] = [
  { key: "platform_name", category: "general", label: "Platform name", valueType: "string", isDangerous: false },
  { key: "support_email", category: "general", label: "Support email", valueType: "string", isDangerous: false },
  { key: "default_timezone", category: "general", label: "Default timezone", valueType: "string", isDangerous: false },
  { key: "default_currency", category: "general", label: "Default currency", valueType: "string", isDangerous: false },
  { key: "maintenance_message", category: "general", label: "Maintenance message", valueType: "string", isDangerous: false },

  { key: "max_listing_photos", category: "marketplace", label: "Max listing photos", valueType: "number", isDangerous: false },
  { key: "require_documents_for_approval", category: "marketplace", label: "Require documents before approval", valueType: "boolean", isDangerous: false },
  { key: "max_booking_advance_days", category: "marketplace", label: "Max booking advance (days)", valueType: "number", isDangerous: false },
  { key: "min_cancellation_notice_hours", category: "marketplace", label: "Min cancellation notice (hours)", valueType: "number", isDangerous: false },

  { key: "max_upload_size_mb", category: "security", label: "Max upload size (MB)", valueType: "number", isDangerous: false },
  { key: "allowed_upload_file_types", category: "security", label: "Allowed upload file types", valueType: "string[]", isDangerous: false },
  { key: "session_timeout_minutes", category: "security", label: "Session timeout (minutes)", valueType: "number", isDangerous: false },
  { key: "max_login_attempts", category: "security", label: "Max login attempts", valueType: "number", isDangerous: false },

  { key: "maintenance_mode", category: "maintenance", label: "Maintenance mode", valueType: "boolean", isDangerous: true },
  { key: "read_only_mode", category: "maintenance", label: "Read-only mode", valueType: "boolean", isDangerous: true },
];

export type SystemSetting = {
  key: string;
  category: SettingCategory;
  value: unknown;
  description: string;
  isDangerous: boolean;
  updatedByName: string | null;
  updatedAt: string;
};

export type SettingHistoryEntry = {
  id: string;
  settingKey: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
};
