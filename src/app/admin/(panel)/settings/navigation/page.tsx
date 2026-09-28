import { NavEditor } from "@/components/admin/ShopSettingsEditors";
import { saveNavSettings } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { getShopSettings } from "@/lib/shop/server";
import { linkTargets } from "@/lib/admin/linkTargets";
import SettingsTabs from "../SettingsTabs";

export const metadata = { title: "Navigation" };

export default async function NavigationSettingsPage() {
  await requireAdmin();
  const [s, targets] = await Promise.all([getShopSettings(), linkTargets()]);
  return (
    <div className="w-full">
      <SettingsTabs current="/admin/settings/navigation" />
      <NavEditor action={saveNavSettings} initial={s.nav} targets={targets} />
    </div>
  );
}
