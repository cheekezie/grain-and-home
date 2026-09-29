import Link from "next/link";
import EditHeader from "@/components/admin/EditHeader";
import { searchPrintful } from "@/lib/admin/printful";

export const metadata = { title: "Import from Printful" };

const SHOWN = 60;

export default async function PrintfulImportPage({ searchParams }: PageProps<"/admin/products/import">) {
  const { q: rawQ } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 80) : "";
  let results: Awaited<ReturnType<typeof searchPrintful>> | null = null;
  let failed = false;
  if (q) {
    try {
      results = await searchPrintful(q);
    } catch (e) {
      console.error("[printful] search failed", e);
      failed = true;
    }
  }

  return (
    <div className="w-full">
      <EditHeader backHref="/admin/products" backLabel="Products" title="Import from Printful" />
      <p className="max-w-[65ch] text-muted">
        Find a blank in Printful&rsquo;s catalogue, choose the colours and sizes to sell, and it opens as a new draft product with its options, a photo for each colour and Printful&rsquo;s variant codes. Nothing is saved until you save it.
      </p>
      <form className="mt-6 flex max-w-xl gap-2" role="search">
        <label htmlFor="printful-q" className="sr-only">Search Printful&rsquo;s catalogue</label>
        <input id="printful-q" name="q" defaultValue={q} placeholder="e.g. heavyweight t-shirt, hoodie, Bella Canvas" className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2.5" />
        <button className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-strong">Search</button>
      </form>

      {failed && <p className="mt-6 rounded-xl bg-notice p-4">Printful&rsquo;s catalogue didn&rsquo;t answer. Try again in a minute.</p>}
      {results && results.length === 0 && <p className="mt-6 rounded-xl border border-line bg-white p-5">Nothing in Printful&rsquo;s catalogue matches &ldquo;{q}&rdquo;. Try one word, like &ldquo;hoodie&rdquo;.</p>}
      {results && results.length > 0 && (
        <>
          <p className="mt-6 text-[14px] text-muted">
            {results.length > SHOWN ? `First ${SHOWN} of ${results.length} matches: add a word to narrow it down.` : `${results.length} ${results.length === 1 ? "match" : "matches"}`}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.slice(0, SHOWN).map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/import/${p.id}`} className="group block rounded-xl border border-line bg-white p-3 hover:border-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Printful's catalogue thumbnails, admin only */}
                  <img src={p.image} alt="" loading="eager" className="aspect-square w-full rounded-lg bg-mist object-contain" />
                  <span className="mt-2 block text-[15px] font-semibold leading-snug group-hover:underline">{p.title}</span>
                  <span className="block text-[13px] text-muted">{p.variantCount} variants</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
