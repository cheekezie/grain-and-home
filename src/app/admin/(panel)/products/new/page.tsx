import EditHeader from "@/components/admin/EditHeader";
import { ProductEditor } from "@/components/admin/editors";
import { adminSuppliers } from "@/lib/admin/queries";
import { emptyProduct } from "@/lib/admin/productForm";
import { saveProduct } from "@/app/admin/actions";
import { productEditorShop } from "@/lib/admin/productShop";
import { printfulDraft, printfulProduct } from "@/lib/admin/printful";
import { fxRate } from "@/lib/admin/fx";
import { CURRENCY } from "@/lib/money";
import BackLink from "@/components/admin/BackLink";

export const metadata = { title: "Add product" };

const list = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);

export default async function NewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  const [suppliers, shop, sp] = await Promise.all([adminSuppliers(), productEditorShop(), searchParams]);
  const active = suppliers.filter((s) => s.active);
  let initial = emptyProduct(shop.fields, shop.categories[0]?.value);
  let fromPrintful: string | null = null;
  let backHref = "/admin/products";

  // Opened from Import from Printful with the chosen colours and sizes.
  const printfulId = typeof sp.printful === "string" ? Number(sp.printful) : NaN;
  if (Number.isInteger(printfulId)) {
    const [p, fx] = await Promise.all([printfulProduct(printfulId).catch(() => null), fxRate("USD", CURRENCY)]);
    const draft = p
      ? printfulDraft(p, list(sp.colour), list(sp.size), {
          fields: shop.fields,
          category: shop.categories[0]?.value,
          supplierId: active.find((s) => /printful/i.test(s.name))?.id,
        }, fx, typeof sp.q === "string" ? sp.q : "")
      : { error: "Printful's catalogue didn't answer. Go back and try again." };
    if ("error" in draft) {
      return (
        <div className="w-full">
          <BackLink href={`/admin/products/import${p ? `/${printfulId}` : ""}`} label="the Printful catalogue" />
          <p className="mt-4 rounded-xl bg-notice p-4 font-semibold">{draft.error}</p>
        </div>
      );
    }
    initial = draft;
    fromPrintful = p!.title;
    backHref = `/admin/products/import/${printfulId}${typeof sp.q === "string" && sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`;
  }

  return (
    <div className="w-full">
      <EditHeader backHref={backHref} backLabel={fromPrintful ? "colours and sizes" : "Products"} title="Add product" />
      {fromPrintful && (
        <p role="status" className="-mt-4 mb-8 max-w-[70ch] rounded-lg bg-accent-soft p-3 text-[15px]">
          Started from Printful&rsquo;s <strong>{fromPrintful}</strong>. Choose the category, set your prices and rewrite the description, then save. It stays a draft until you publish it.
        </p>
      )}
      <ProductEditor
        isNew
        initial={initial}
        shop={shop}
        action={saveProduct.bind(null, null)}
        suppliers={active.map((s) => ({ value: s.id, label: s.name }))}
      />
    </div>
  );
}
