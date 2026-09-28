import { GeneralSettingsEditor } from "@/components/admin/ShopSettingsEditors";
import { saveGeneralSettings } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { getShopSettings } from "@/lib/shop/server";
import { linkTargets } from "@/lib/admin/linkTargets";
import SettingsTabs from "./SettingsTabs";
import PresetPicker from "./PresetPicker";

export const metadata = { title: "Shop settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const [s, targets] = await Promise.all([getShopSettings(), linkTargets()]);
  const img = s.hero.image;
  return (
    <div className="w-full">
      <SettingsTabs current="/admin/settings" />
      {!s.configured && <PresetPicker />}
      <GeneralSettingsEditor
        action={saveGeneralSettings}
        targets={targets}
        initial={{
          tagline: s.tagline,
          seoTitle: s.seoTitle,
          hero: {
            layout: s.hero.layout,
            headline: s.hero.headline,
            subline: s.hero.subline,
            image: { url: img?.url ?? "", alt: img?.alt ?? "", credit: img?.credit ?? "", creditUrl: img?.creditUrl ?? "" },
            primary: s.hero.primary ?? { label: "", href: "" },
            secondary: s.hero.secondary ?? { label: "", href: "" },
          },
          home: s.home,
          trust: s.trust,
          words: s.words,
          delivery: s.delivery,
          google: s.google,
          theme: { accent: s.theme?.accent ?? "", page: s.theme?.page ?? "", panel: s.theme?.panel ?? "", ink: s.theme?.ink ?? "", fonts: s.theme?.fonts ?? "classic", cards: s.theme?.cards ?? "panel" },
        }}
      />
    </div>
  );
}
