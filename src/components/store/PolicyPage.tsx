import { businessDetailsMissing, siteConfig } from "@/lib/siteConfig";

export default function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-2 text-[14px] text-muted">Last updated {updated}</p>
      {businessDetailsMissing() && (
        <p className="mt-6 rounded-xl bg-notice p-4 text-[15px]">
          The business name and contact email for {siteConfig.name} haven&rsquo;t been set yet.
        </p>
      )}
      <div className="prose-store mt-8 text-[16px] leading-relaxed">{children}</div>
    </div>
  );
}
