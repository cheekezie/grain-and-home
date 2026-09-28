import { DetailFieldsEditor } from "@/components/admin/ShopSettingsEditors";
import { saveDetailFields } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ProductModel from "@/models/Product";
import { getShopSettings } from "@/lib/shop/server";
import SettingsTabs from "../SettingsTabs";

export const metadata = { title: "Product details" };

export default async function ProductDetailsSettingsPage() {
  await requireAdmin();
  const s = await getShopSettings();
  await connectDB();
  // Which details products actually have values for (shown next to each).
  const used = await Promise.all(s.details.map(async (f) => ((await ProductModel.exists({ [`details.${f.key}`]: { $exists: true } })) ? f.key : null)));
  return (
    <div className="w-full">
      <SettingsTabs current="/admin/settings/product-details" />
      <DetailFieldsEditor
        action={saveDetailFields}
        usedKeys={used.filter((k): k is string => !!k)}
        initial={s.details.map((f) => ({ key: f.key, label: f.label, kind: f.kind, unit: f.unit ?? "", options: f.options ?? [], required: !!f.required, filterable: !!f.filterable, google: f.google ?? "" }))}
      />
    </div>
  );
}
