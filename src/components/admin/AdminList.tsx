import Link from "next/link";

export interface Row {
  href: string;
  title: string;
  sub?: string;
  status?: "draft" | "published";
  /** Editorial problems worth fixing, shown in red. */
  issues?: string[];
  /** Extra control at the end of the row (e.g. a publish toggle). */
  action?: React.ReactNode;
  /** Small secondary line under the title, e.g. price and margin. */
  meta?: string;
}

export function PageHead({ title, newHref, newLabel, notice, extra }: { title: string; newHref?: string; newLabel?: string; notice?: string; extra?: { href: string; label: string } }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl leading-tight">{title}</h1>
        <div className="flex flex-wrap items-center gap-4">
          {extra && (
            <Link href={extra.href} className="font-semibold text-accent underline">
              {extra.label}
            </Link>
          )}
          {newHref && (
            <Link href={newHref} className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-strong">
              {newLabel}
            </Link>
          )}
        </div>
      </div>
      {notice && <p role="status" className="mt-4 rounded-lg bg-accent-soft p-3 font-semibold">{notice}</p>}
    </>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${status === "published" ? "bg-accent-soft text-accent" : "bg-mist text-muted"}`}>
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

export default function AdminList({ rows, empty }: { rows: Row[]; empty: string }) {
  if (rows.length === 0) return <p className="mt-8 rounded-xl border border-line bg-white p-5">{empty}</p>;
  return (
    <ul className="mt-8 divide-y divide-line rounded-xl border border-line bg-white">
      {rows.map((r) => (
        <li key={r.href} className="flex items-start gap-3 pr-4 hover:bg-mist">
          <Link href={r.href} className="flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-1 p-4">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{r.title}</span>
              {r.sub && <span className="block text-[14px] text-muted">{r.sub}</span>}
              {r.meta && <span className="tabular block text-[14px]">{r.meta}</span>}
              {r.issues && r.issues.length > 0 && (
                <span className="mt-1 block text-[14px] text-danger">{r.issues.join(". ")}.</span>
              )}
            </span>
            {r.status && <StatusBadge status={r.status} />}
          </Link>
          {r.action && <span className="pt-3">{r.action}</span>}
        </li>
      ))}
    </ul>
  );
}
