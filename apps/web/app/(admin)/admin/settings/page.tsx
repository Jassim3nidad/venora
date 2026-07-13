import type { Metadata } from "next";
import { DashboardSubPage, EmptyState, Panel, PanelHeader } from "@/components/dashboard/enterprise";
import { requirePermissionOrRedirect, hasPermission } from "@/lib/rbac/admin-context";
import { getSystemSettings } from "@/features/admin-settings/application/queries";
import { SETTING_DEFINITIONS, type SettingCategory } from "@/features/admin-settings/types/system-setting.types";
import { SettingRow } from "@/features/admin-settings/ui/SettingRow";

export const metadata: Metadata = { title: "System Settings - Admin" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<SettingCategory, { title: string; description: string }> = {
  general: { title: "General", description: "Platform identity and defaults." },
  marketplace: { title: "Marketplace", description: "Listing and booking limits." },
  security: { title: "Security", description: "Uploads, sessions, and login protection." },
  maintenance: { title: "Maintenance", description: "Platform-wide switches — changes require a reason." },
};

export default async function AdminSettingsPage() {
  await requirePermissionOrRedirect("system_settings.view");
  const canManage = await hasPermission("system_settings.manage");

  const { settings, error } = await getSystemSettings();

  if (error || !settings) {
    return (
      <DashboardSubPage title="System Settings">
        <EmptyState icon="error" title="Could not load settings" description={error ?? "Unknown error"} />
      </DashboardSubPage>
    );
  }

  const settingByKey = new Map(settings.map((s) => [s.key, s]));
  const categories: SettingCategory[] = ["general", "marketplace", "security", "maintenance"];

  return (
    <DashboardSubPage
      title="System Settings"
      description={canManage ? "Typed, validated platform configuration." : "You can view system settings, but changing them requires the system_settings.manage permission."}
    >
      {categories.map((category) => {
        const defs = SETTING_DEFINITIONS.filter((d) => d.category === category);
        return (
          <Panel key={category}>
            <PanelHeader title={CATEGORY_LABELS[category].title} description={CATEGORY_LABELS[category].description} />
            <div>
              {defs.map((def) => {
                const setting = settingByKey.get(def.key);
                if (!setting) return null;
                return canManage ? (
                  <SettingRow key={def.key} definition={def} setting={setting} />
                ) : (
                  <div key={def.key} className="flex items-center justify-between border-b border-[#f1f5f9] py-4 last:border-0">
                    <div>
                      <p className="text-sm font-bold text-[#111827]">{def.label}</p>
                      <p className="text-xs text-[#6b7280]">{setting.description}</p>
                    </div>
                    <p className="text-sm text-[#111827]">{JSON.stringify(setting.value)}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </DashboardSubPage>
  );
}
