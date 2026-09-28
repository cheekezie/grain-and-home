import { applyPreset } from "@/app/admin/actions";
import { PRESETS } from "@/lib/shop/presets";

/** Shown once, on a new shop: fill settings and categories from a starting point. */
export default function PresetPicker() {
  return (
    <section className="mb-8 rounded-xl border border-line bg-white p-5">
      <h2 className="font-display text-2xl">Start from a preset</h2>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">
        This shop isn&rsquo;t set up yet. Pick what it sells to fill in categories, wording, the hero, delivery and product details. Everything can be
        changed afterwards. Presets add no photos: add your own.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(PRESETS).map(([key, p]) => (
          <li key={key}>
            <form action={applyPreset.bind(null, key)} className="flex h-full flex-col rounded-xl border border-line p-4">
              <p className="font-semibold">{p.label}</p>
              <p className="mt-1 flex-1 text-[14px] text-muted">{p.description}</p>
              <button type="submit" className="mt-4 rounded-lg bg-ink px-4 py-2 font-semibold text-white">Use {p.label.toLowerCase()}</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
