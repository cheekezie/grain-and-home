import Link from "next/link";

const TABS = [
  { href: "/admin/settings", label: "General" },
  { href: "/admin/settings/navigation", label: "Navigation" },
  { href: "/admin/settings/product-details", label: "Product details" },
];

export default function SettingsTabs({ current }: { current: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-4xl leading-tight">Shop settings</h1>
      <nav aria-label="Settings" className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={current === t.href ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${current === t.href ? "bg-ink text-white" : "border border-line bg-white hover:border-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
